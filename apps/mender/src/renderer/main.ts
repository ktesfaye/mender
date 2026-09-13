import { ReplicaState } from '@emdash/wire/live';
import { CAMP, Document, extentOf, type District } from '@mender/village';
import { Application, Container, type FederatedPointerEvent } from 'pixi.js';
import type { Mood } from '@shared/agents';
import type { Project } from '@shared/projects';
import type { Task } from '@shared/tasks';
import { makeBoard, type Board, type Row } from './board/board';
import { openCard, type LiveCard } from './board/card';
import { openCheckout, type LiveBoard } from './board/district';
import { chordFor, FIND, finding, type Standing as Where } from './board/finder';
import { loadLettering } from './board/lettering';
import type { Meant } from './board/palette';
import { makeRail, type Peg, type Rail } from './board/rail';
import { answerFor, openWork, type LiveWork } from './board/work';
import { createCamera, flyOut, flyTo, frame, type Extent } from './village/camera';
import { Folk, loadFolk, type Standing } from './village/folk';
import { districtBounds, Ground, type Aim } from './village/ground';
import { loadKit } from './village/kit';
import { say } from './village/notice';
import { buildScene } from './village/scene';
import { wire, type MenderClient } from './wire';

/** The kinds of picture an agent can actually be shown. */
const CARRIED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/**
 * You open Mender and you see the village.
 *
 * Nothing else is on the screen: no title bar full of buttons, no sidebar, no
 * tab strip. The island is composed in the main process out of the state the
 * app is actually in — which projects exist, which tasks are running in them —
 * and drawn here. Everything the app can do arrives as something standing on
 * it, and everything it has to say arrives on one wooden board.
 */
async function boot(): Promise<void> {
  const pixi = new Application();
  await pixi.init({
    resizeTo: window,
    background: '#2d5d6b',
    antialias: false,
    roundPixels: true,
    preference: 'webgl',
  });
  pixi.renderer.canvas.style.imageRendering = 'pixelated';
  document.body.appendChild(pixi.canvas);

  const camera = createCamera(pixi);
  const world = new Container();
  camera.addChild(world);

  try {
    say('waking the village…');
    const [client] = await Promise.all([wire(), loadKit(), loadFolk(), loadLettering()]);
    const board = await makeBoard(pixi);
    const rail = await makeRail(pixi);
    let drawn = await draw(world, client);
    let projects = await client.projects.list({});
    let tasks: Task[] = [];
    frame(camera, drawn.island);
    /* The window is not its real size when the renderer starts — it is
       restored to whatever it was last time a moment later — so the opening
       shot has to be taken again once it settles, or the island sits small in
       a corner of a window it was never measured against. Only while nothing
       is open: once you are looking at something, the camera is yours. */
    window.addEventListener('resize', () => {
      if (!open) frame(camera, drawn.island);
    });
    pixi.ticker.add((ticker) => {
      drawn.ground.tick(ticker);
      drawn.folk.tick(ticker);
    });

    /** The place the board is standing in front of, while it is in. */
    let open: Aim | null = null;
    let live: LiveBoard | null = null;
    /** Set while the board in front of you is a task's, which can be talked to. */
    let work: LiveWork | null = null;
    /** The task that board belongs to. */
    let inside: Task | null = null;
    /** Set while the board is showing what that session works with. */
    let card: LiveCard | null = null;
    /** Set while a name for something new is being written on the wood. */
    let naming: {
      district: District;
      project: Project;
      slot: number | null;
      written: string;
    } | null = null;
    /** Set while an existing session is being called something else. */
    let titling: { task: Task; written: string } | null = null;
    /** Set while the board is the finder, and what has been typed into it. */
    let looking: { written: string; from: Spot } | null = null;
    /** What everybody is doing, as the main process sees it. */
    let seen: Record<string, Mood> = {};

    /* Where you have been, so you can go back. One list, one finger on it:
       arriving somewhere new cuts off whatever you had gone back from, which
       is the only behaviour anybody has ever expected of this. */
    let trail: Spot[] = [{ kind: 'island' }];
    let step = 0;
    /** Set while the trail is walking itself, so it does not record its own
        footsteps as new places. */
    let retracing = false;

    /** Where you are standing, which decides what there is to do. */
    const standing = (): Where =>
      card ? 'card' : inside ? 'session' : open ? 'district' : 'island';

    const spot = (): Spot =>
      inside
        ? { kind: 'task', id: inside.id, card: Boolean(card) }
        : open
          ? { kind: 'project', id: projectOn(open.district)?.id ?? '' }
          : { kind: 'island' };

    const arrived = (): void => {
      if (retracing || looking) return;
      const now = spot();
      if (same(trail[step], now)) return;
      trail = [...trail.slice(0, step + 1), now].slice(-40);
      step = trail.length - 1;
      // And the app opens where you left it. Closing an app is not the same as
      // being finished with what was on the screen.
      try {
        localStorage.setItem('mender.where', JSON.stringify(now));
      } catch {
        // A window with no storage is a window that opens on the island.
      }
    };

    const projectOn = (district: District): Project | undefined =>
      projects.find((candidate) => candidate.plot === district.id);
    const tasksOn = (district: District): Task[] => {
      const project = projectOn(district);
      return project ? tasks.filter((task) => task.project === project.id) : [];
    };
    /** The task standing in one of a district's buildings, if any is. */
    const taskIn = (district: District, slot: number): Task | undefined =>
      tasksOn(district).find((task) => task.slot === slot);
    /** The first building on a district nobody is in, if there is one. */
    const freeSlot = (district: District): number | null => {
      const taken = new Set(tasksOn(district).map((task) => task.slot));
      for (let slot = 0; slot < drawn.ground.room(district); slot += 1) {
        if (!taken.has(slot)) return slot;
      }
      return null;
    };

    /* The rail carries one peg per project and nothing else. Where the work
       is happening is the project's own board to say; this is only how you
       walk from one village to the next. */
    const paintRail = (): void => {
      const here = open ? projectOn(open.district) : undefined;
      rail.show(
        projects.map((project): Peg => {
          const moods = tasks
            .filter((task) => task.project === project.id)
            .map((task) => seen[task.id]);
          const tone = moods.includes('hurt')
            ? ('sore' as const)
            : moods.includes('asking')
              ? ('keen' as const)
              : undefined;
          return {
            id: `project:${project.id}`,
            mark: project.name.slice(0, 1).toUpperCase(),
            name: project.name,
            here: project.id === here?.id,
            ...(tone ? { tone } : {}),
          };
        })
      );
    };

    /**
     * What a pressed thing means, wherever it was pressed.
     *
     * A peg on the rail and a line on the board say the same words, so they
     * are answered in the same place: a project takes you to its board, a
     * session opens it, and the one you are already inside is how you call it
     * something else.
     */
    const go = (id: string): void => {
      // The finder is a board like any other, so picking something on it is
      // picking that thing: it steps out of the way first and then answers.
      if (looking && id !== FIND) looking = null;
      if (id === 'new') {
        const district = open?.district;
        if (district) askName({ kind: 'district', district }, freeSlot(district));
        return;
      }
      if (id === FIND) {
        look();
        return;
      }
      if (id === 'do:found') {
        void settle();
        return;
      }
      if (id === 'do:out') {
        void (async () => {
          await shut();
          flyOut(camera, drawn.island);
          arrived();
        })();
        return;
      }
      if (id === 'do:back' || id === 'do:forward') {
        void retrace(id === 'do:back' ? -1 : 1);
        return;
      }
      // Opening up what a piece of work actually did, which is the one pick a
      // session's own board offers besides turning it over.
      if (id.startsWith('fold:')) {
        work?.fold(id.slice(5));
        return;
      }
      // Taking back something you said while it was busy. It never reached the
      // agent, so nothing has to be undone — it just stops waiting.
      if (id.startsWith('unsay:')) {
        const task = inside;
        if (task) void client.agents.unsay({ task: task.id, id: id.slice(6) });
        return;
      }
      if (id === 'do:rename') {
        if (inside) askTitle(inside);
        return;
      }
      // Turning the board over, which is the same move whichever way it is
      // facing: it is one board showing one of two things about one session.
      if (id === 'card') {
        const task = inside;
        const aim = open;
        if (task && aim) void (card ? openTask(aim, task) : showCard(aim, task));
        return;
      }
      if (id.startsWith('rail:')) {
        const project = projects[Number(id.slice(5))];
        if (project) go(`project:${project.id}`);
        return;
      }
      if (id.startsWith('project:')) {
        const project = projects.find((candidate) => candidate.id === id.slice(8));
        const district = project && drawn.districts.get(project.plot ?? '');
        // A peg always takes you to that project, never away from it: pressing
        // the one you are standing on is how you get back out of a session.
        if (district) void openDistrict({ kind: 'district', district });
        return;
      }
      if (!id.startsWith('task:')) return;
      const task = tasks.find((candidate) => candidate.id === id.slice(5));
      if (!task) return;
      const district = drawn.districts.get(
        projects.find((project) => project.id === task.project)?.plot ?? ''
      );
      if (district) {
        void openTask(
          task.slot === null
            ? { kind: 'district', district }
            : { kind: 'building', district, slot: task.slot },
          task
        );
      }
    };

    /** Open the finder over whatever you were looking at. */
    const look = (): void => {
      looking = { written: '', from: spot() };
      board.show(finding('', { projects, tasks, moods: seen, where: standing() }));
      board.walk(1);
    };

    /** Put the board back on whatever the finder was opened over. */
    const unlook = async (): Promise<void> => {
      const was = looking;
      looking = null;
      if (was) await visit(was.from);
    };

    /** Walk the trail one step, without laying a new one. */
    const retrace = async (by: number): Promise<void> => {
      const next = step + by;
      const going = trail[next];
      if (!going) return;
      step = next;
      retracing = true;
      try {
        await visit(going);
      } finally {
        retracing = false;
      }
    };

    /** Stand somewhere the trail remembers, or somewhere it was told. */
    const visit = async (going: Spot): Promise<void> => {
      if (going.kind === 'island') {
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      if (going.kind === 'project') {
        const project = projects.find((each) => each.id === going.id);
        const district = project && drawn.districts.get(project.plot ?? '');
        if (district) await openDistrict({ kind: 'district', district });
        else {
          await shut();
          flyOut(camera, drawn.island);
        }
        return;
      }
      const task = tasks.find((each) => each.id === going.id);
      const district =
        task && drawn.districts.get(projects.find((p) => p.id === task.project)?.plot ?? '');
      // Somewhere that is not there any more puts you back out on the water,
      // rather than leaving you looking at whatever was already on the board.
      if (!task || !district) {
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      const aim: Aim =
        task.slot === null
          ? { kind: 'district', district }
          : { kind: 'building', district, slot: task.slot };
      await openTask(aim, task);
      if (going.card) await showCard(aim, task);
    };

    rail.onPick(go);

    /** Put a checkout on the island. The one thing the campfire is for. */
    const settle = async (): Promise<void> => {
      await found(client, async () => {
        await shut();
        drawn = await draw(world, client);
        projects = await client.projects.list({});
        people();
        frame(camera, drawn.island);
      });
    };

    const shut = async (): Promise<void> => {
      open = null;
      naming = null;
      titling = null;
      looking = null;
      inside = null;
      work = null;
      const shown = card;
      card = null;
      await shown?.close();
      board.hide();
      paintRail();
      const was = live;
      live = null;
      await was?.close();
    };

    /** Put a checkout on the board and keep it there until something else is. */
    const stand = async (
      aim: Aim,
      name: string,
      path: string,
      lines: () => Row[]
    ): Promise<void> => {
      const was = live;
      live = null;
      work = null;
      inside = null;
      await was?.close();

      open = aim;
      naming = null;
      titling = null;
      paintRail();
      board.show([
        { kind: 'title', text: name },
        { kind: 'line', text: path, tone: 'faded', keep: 'tail' },
        { kind: 'gap' },
        { kind: 'line', text: 'reading the checkout…', tone: 'faded' },
      ]);

      const opened = await openCheckout(client, { name, path, lines }, (rows) => {
        if (open === aim) board.update(rows);
      });
      if (open !== aim) {
        await opened.close();
        return;
      }
      live = opened;
      board.update(opened.rows());
    };

    /**
     * What a project's board is: everything running in it.
     *
     * You open a district to get at the work, so the work is what is on the
     * wood — every session in it under the name it gave itself, what each one
     * is doing, and a line that starts another. The checkout underneath is a
     * footnote at the bottom, because the folder is not the point.
     */
    const roster = (district: District): Row[] => {
      const standing = tasksOn(district);
      const rows: Row[] = [{ kind: 'gap' }, { kind: 'heading', text: 'sessions' }];
      if (!standing.length) {
        rows.push({
          kind: 'prose',
          text: 'nothing is running here yet. say what you want doing and it gets its own branch, its own checkout and somebody to do it.',
          tone: 'faded',
        });
      }
      for (const task of standing) {
        rows.push({
          kind: 'entry',
          mark: markOf(seen[task.id]) ?? '·',
          text: task.title,
          tone: toneOf(seen[task.id]) ?? 'ink',
          pick: `task:${task.id}`,
        });
      }
      rows.push({
        kind: 'entry',
        mark: '+',
        text: standing.length ? 'start another one' : 'start one',
        tone: 'faded',
        pick: 'new',
      });
      return rows;
    };

    /* Opening a district is one move with two halves: the camera pulls in on
       its land, aiming at the part of the window the board is about to leave,
       and the board comes in from the right with everything running in there
       written on it. Neither waits for the other. */
    const openDistrict = async (aim: Aim): Promise<void> => {
      const project = projectOn(aim.district);
      if (!project) return;
      flyTo(camera, districtBounds(aim.district), { inset: board.inset });
      await stand(aim, project.name, project.path, () => roster(aim.district));
      arrived();
    };

    /**
     * What the session works with, on the same board the conversation was on.
     *
     * This is the whole answer to how the board shows something else: the rail
     * does it, the same way it changes which session you are looking at. There
     * is still one board and it is still showing one thing.
     */
    const showCard = async (aim: Aim, task: Task): Promise<void> => {
      const was = live;
      live = null;
      work = null;
      await was?.close();
      const shown = card;
      card = null;
      await shown?.close();

      open = aim;
      inside = task;
      const opened = await openCard(client, task, (rows) => {
        if (open === aim && card) board.update(rows);
      });
      if (open !== aim) {
        await opened.close();
        return;
      }
      card = opened;
      paintRail();
      board.show(opened.rows());
      arrived();
    };

    /**
     * A building with a task in it is that task's own checkout, and whoever is
     * working in it. The board opens at the bottom, because the bottom is now.
     */
    const openTask = async (aim: Aim, task: Task): Promise<void> => {
      flyTo(camera, districtBounds(aim.district), { inset: board.inset });
      const was = live;
      live = null;
      work = null;
      await was?.close();
      const shown = card;
      card = null;
      await shown?.close();

      open = aim;
      naming = null;
      titling = null;
      inside = task;
      paintRail();
      board.show(
        [
          { kind: 'title', text: task.title },
          { kind: 'line', text: task.path, tone: 'faded', keep: 'tail' },
          { kind: 'gap' },
          { kind: 'line', text: 'looking in…', tone: 'faded' },
        ],
        'now'
      );

      const opened = await openWork(client, task, (rows) => {
        if (open === aim) board.update(rows);
      });
      if (open !== aim) {
        await opened.close();
        return;
      }
      live = opened;
      work = opened;
      board.show(opened.rows(), 'now');
      arrived();
      /* And wake whoever lives in there. A session keeps its checkout and its
         transcript across a restart but the agent is not running, and a
         sleeping agent cannot say what it can do — so opening the board is
         what starts it, not the first thing you say. */
      void client.agents.wake({ task: task.id }, { timeoutMs: 0 });
    };

    /** A new session is a question: what is going to happen in there. */
    const askName = (aim: Aim, slot: number | null): void => {
      const project = projectOn(aim.district);
      if (!project) return;
      open = aim;
      inside = null;
      work = null;
      titling = null;
      naming = { district: aim.district, project, slot, written: '' };
      paintRail();
      flyTo(camera, districtBounds(aim.district), { inset: board.inset });
      board.show(asking(naming));
    };

    /** Calling a session something else. His name for it outranks the agent's. */
    const askTitle = (task: Task): void => {
      naming = null;
      titling = { task, written: task.title };
      board.show(retitling(titling));
    };

    const wrote = (written: string): void => {
      if (looking) {
        looking = { ...looking, written };
        board.update(finding(written, { projects, tasks, moods: seen, where: standing() }));
        // The finder always has something under the keyboard, so return means
        // the obvious thing without you having to aim first.
        if (!board.chosen()) board.walk(1);
        return;
      }
      if (titling) {
        titling = { ...titling, written };
        board.update(retitling(titling));
        return;
      }
      if (!naming) return;
      naming = { ...naming, written };
      board.update(asking(naming));
    };

    const begin = async (): Promise<void> => {
      if (!naming) return;
      const { project, slot, written } = naming;
      const aim = open;
      naming = null;
      board.update([
        { kind: 'title', text: written },
        { kind: 'gap' },
        { kind: 'line', text: 'cutting a worktree…', tone: 'faded' },
      ]);
      // No deadline: a worktree on a big repository is minutes of copying, plus
      // whatever that project runs to make a checkout usable.
      const made = await client.tasks.begin(
        { project: project.id, name: written, slot },
        { timeoutMs: 0 }
      );
      if (!made.success) {
        say(whyNot(made.error), 6000);
        await shut();
        flyOut(camera, drawn.island);
        return;
      }
      // The first thing written in a new session is the first thing said in
      // it. There is no separate step where you name it and then start it.
      void client.agents.tell({ task: made.data.id, text: written }, { timeoutMs: 0 });
      if (aim) await openTask(aim, made.data);
    };

    /** Writing a new name on a session that already has one. */
    const retitle = async (): Promise<void> => {
      const asked = titling;
      if (!asked) return;
      titling = null;
      const written = asked.written.trim();
      if (written && written !== asked.task.title) {
        await client.tasks.rename({ id: asked.task.id, title: written });
      }
      const aim = open;
      const again = tasks.find((task) => task.id === asked.task.id) ?? asked.task;
      if (aim) await openTask(aim, again);
    };

    const picked = async (aim: Aim | null): Promise<void> => {
      if (!aim) {
        await shut();
        flyOut(camera, drawn.island);
        arrived();
        return;
      }
      // The camp is where the island grows from: its fire is the only thing on
      // an empty island, and founding a project is what it is for.
      if (aim.district.id === CAMP) {
        await settle();
        return;
      }
      if (open && sameAim(aim, open)) {
        await shut();
        flyOut(camera, drawn.island);
        arrived();
        return;
      }
      if (aim.kind === 'building') {
        const task = taskIn(aim.district, aim.slot);
        if (task) await openTask(aim, task);
        else askName(aim, aim.slot);
        return;
      }
      await openDistrict(aim);
    };

    /**
     * Whatever is written on a task's board is said to whoever is in there —
     * and nothing written, while they are working, calls them off.
     */
    const tell = async (): Promise<void> => {
      const task = inside;
      const saying = work;
      if (!task || !saying) return;
      const text = saying.written().trim();
      const carrying = [...saying.carrying()];
      if (!text && !carrying.length) {
        if (saying.working()) await client.agents.hush({ task: task.id });
        return;
      }
      saying.wrote('');
      saying.handed();
      const heard = await client.agents.tell(
        { task: task.id, text, ...(carrying.length ? { carrying } : {}) },
        { timeoutMs: 0 }
      );
      if (!heard.success) {
        say(heard.error.kind === 'refused' ? heard.error.because : 'nobody heard that.', 6000);
      }
    };

    const answer = async (key: string): Promise<void> => {
      const task = inside;
      const asked = work?.asked();
      if (!task || !asked) return;
      const optionId = answerFor(asked, key);
      if (!optionId) return;
      const given = await client.agents.answer({
        task: task.id,
        requestId: asked.requestId,
        optionId,
      });
      if (!given.success && given.error.kind === 'refused') say(given.error.because, 6000);
    };

    /**
     * What a slash meant.
     *
     * The village's own commands never reach the agent as words: picking a
     * model is a setting on a running session, not a sentence, so it is done
     * to the session and the line it was written on is wiped.
     */
    const obey = async (meant: Meant): Promise<void> => {
      const task = inside;
      const saying = work;
      const aim = open;
      if (!task || !saying) return;
      if (meant.does === 'write') {
        saying.wrote(meant.text);
        return;
      }
      if (meant.does === 'card') {
        saying.wrote('');
        if (aim) await showCard(aim, task);
        return;
      }
      if (meant.does !== 'set') return;
      saying.wrote('');
      const done = await client.agents.choose(
        { task: task.id, what: meant.what, id: meant.id },
        { timeoutMs: 0 }
      );
      if (!done.success) {
        say(done.error.kind === 'refused' ? done.error.because : 'that would not take.', 6000);
      } else say(`${meant.name}.`, 3000);
    };

    board.onPick((pick) => {
      if (pick.startsWith('putdown:')) {
        work?.putDown(pick.slice(8));
        return;
      }
      if (pick.startsWith('name:')) {
        const saying = work;
        const line = saying?.names.named(saying.written(), pick);
        if (saying && line !== null && line !== undefined) saying.wrote(line);
        return;
      }
      if (pick.startsWith('slash:')) {
        const meant = work?.slash.meant(pick);
        if (meant) void obey(meant);
        return;
      }
      if (pick === 'card' || pick === 'new' || pick.startsWith('do:')) {
        go(pick);
        return;
      }
      if (
        pick.startsWith('project:') ||
        pick.startsWith('task:') ||
        pick.startsWith('rail:') ||
        pick.startsWith('fold:') ||
        pick.startsWith('unsay:')
      ) {
        go(pick);
        return;
      }
      const task = inside;
      const meant = card?.meant(pick);
      if (!task || !meant) return;
      void (async () => {
        const done =
          meant.does === 'choose'
            ? await client.agents.choose(
                { task: task.id, what: meant.what, id: meant.id },
                { timeoutMs: 0 }
              )
            : await client.agents.tool({ task: task.id, name: meant.name, on: meant.on });
        if (!done.success && done.error.kind === 'refused') say(done.error.because, 6000);
      })();
    });

    /* A picture dropped on the wood, or pasted onto it.
       There is one place for it to go: whoever is working in the building you
       have open. Dropped anywhere else it does nothing, because nothing else
       in the village has hands. */
    const carry = async (files: readonly File[]): Promise<void> => {
      const saying = work;
      if (!files.length) return;
      if (!saying) {
        say('open a building first, and somebody can take it.', 4000);
        return;
      }
      const pictures = files.filter((file) => CARRIED.includes(file.type));
      if (!pictures.length) {
        say('the village only carries pictures.', 4000);
        return;
      }
      for (const picture of pictures) {
        const trouble = await saying.pickUp(picture);
        if (trouble) say(trouble, 6000);
      }
    };

    // Without this the window navigates to the file and the village vanishes.
    window.addEventListener('dragover', (event) => event.preventDefault());
    window.addEventListener('drop', (event) => {
      event.preventDefault();
      void carry([...(event.dataTransfer?.files ?? [])]);
    });
    window.addEventListener('paste', (event) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (!files.length) return;
      event.preventDefault();
      void carry(files);
    });

    watchPointer(pixi, camera, board, rail, {
      at: (x, y) => drawn.ground.at(x, y),
      hover: (aim) => drawn.ground.hover(aim),
      picked: (aim) => void picked(aim),
      /* Escape lets go of one thing at a time: what you are writing first,
         then the board. Every half-written thing counts, not just a message to
         an agent — a name you were giving a session is work too, and throwing
         it away to close a board nobody asked to close is the app taking
         something from you. */
      escaped: () => {
        if (looking) {
          if (looking.written) {
            wrote('');
            return;
          }
          void unlook();
          return;
        }
        if (titling) {
          if (titling.written) {
            wrote('');
            return;
          }
          titling = null;
          const task = inside;
          if (task && open) void openTask(open, task);
          return;
        }
        if (naming) {
          if (naming.written) {
            wrote('');
            return;
          }
          naming = null;
          if (open) void openDistrict({ kind: 'district', district: open.district });
          return;
        }
        const saying = work;
        if (saying?.written()) {
          saying.wrote('');
          return;
        }
        // Then the session, back to the project it belongs to, and only then
        // the board itself.
        if (inside && open) {
          void openDistrict({ kind: 'district', district: open.district });
          return;
        }
        void picked(null);
      },
      /** A key held with command. One table says what it means. */
      ordered: (event) => {
        const meant = chordFor(event.key, standing(), projects.length);
        if (!meant) return false;
        go(meant);
        return true;
      },
      /* Three things the keyboard can be doing, and never more than one at a
         time: naming a building nobody has moved into, answering the villager
         standing at a door, or saying something to whoever is in there. */
      typed: (event) => {
        /* The finder is a board you type into and walk at the same time, which
           is the whole point of it: the letters narrow it and the arrows pick
           out of what is left. */
        if (looking) {
          if (event.key === 'Enter') {
            const chose = board.chosen();
            if (chose) go(chose);
            else void unlook();
            return true;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            board.walk(event.key === 'ArrowDown' ? 1 : -1);
            return true;
          }
          if (event.key === 'Backspace') wrote(looking.written.slice(0, -1));
          else if (event.key.length === 1) wrote(looking.written + event.key);
          else return board.scrolled(event.key);
          return true;
        }
        if (titling) {
          if (event.key === 'Enter') void retitle();
          else if (event.key === 'Backspace') wrote(titling.written.slice(0, -1));
          else if (event.key.length === 1) wrote(titling.written + event.key);
          else return false;
          return true;
        }
        if (naming) {
          if (event.key === 'Enter') void begin();
          else if (event.key === 'Backspace') wrote(naming.written.slice(0, -1));
          else if (event.key.length === 1) wrote(naming.written + event.key);
          else return false;
          return true;
        }
        const saying = work;
        /* Any other board is a list of things you can press, so the arrows
           walk it and return goes where you are standing. A session's board is
           the exception: it is mostly a conversation, and walking a transcript
           line by line is not what anybody wants from an arrow key there. */
        if (!saying) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            return board.walk(event.key === 'ArrowDown' ? 1 : -1) || board.scrolled(event.key);
          }
          if (event.key === 'Enter') {
            const chose = board.chosen();
            if (!chose) return false;
            go(chose);
            return true;
          }
          return board.scrolled(event.key);
        }
        if (saying.asked()) {
          if (!/^[1-9]$/.test(event.key)) return false;
          void answer(event.key);
          return true;
        }
        /* A session's board is mostly a conversation, so the arrows scroll it
           rather than walking it — except that what a piece of work did is
           opened by pressing it, and nothing should need a pointer. Holding
           shift walks the openable lines instead of scrolling. */
        if (event.shiftKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
          return board.walk(event.key === 'ArrowDown' ? 1 : -1);
        }
        /* An @ in the middle of the line takes the keys the same way a slash
           does, and writes the whole path where the @ was. */
        if (saying.names.open) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            saying.names.moved(event.key === 'ArrowDown' ? 1 : -1);
            saying.wrote(saying.written());
            return true;
          }
          if (event.key === 'Tab' || event.key === 'Enter') {
            const line = saying.names.chosen(saying.written());
            if (line === null) return false;
            saying.wrote(line);
            return true;
          }
        }
        /* A slash on the line takes the keys off the conversation: up and
           down walk what it could mean, and return picks rather than sends. */
        if (saying.slash.open) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            saying.slash.moved(event.key === 'ArrowDown' ? 1 : -1);
            saying.wrote(saying.written());
            return true;
          }
          if (event.key === 'Tab' || event.key === 'Enter') {
            const meant = saying.slash.chosen();
            if (!meant) return false;
            if (meant.does === 'write') {
              saying.wrote(meant.text);
              // A command that takes nothing is finished the moment it is
              // picked, so return says it rather than only writing it.
              if (event.key === 'Enter' && !meant.text.endsWith(' ')) void tell();
            } else void obey(meant);
            return true;
          }
        }
        // Tab opens whatever the shift-arrows landed on. Return is spoken for
        // here: it says what you wrote, or calls them off when you wrote
        // nothing, and shift and return has a newline coming.
        if (event.key === 'Tab') {
          const chose = board.chosen();
          if (!chose) return false;
          go(chose);
          return true;
        }
        if (event.key === 'Enter') void tell();
        else if (event.key === 'Backspace') saying.wrote(saying.written().slice(0, -1));
        else if (event.key.length === 1) saying.wrote(saying.written() + event.key);
        else return false;
        return true;
      },
    });

    /* Who is standing outside which building, kept true by the main process
       rather than by whatever board happens to be open: a villager is still
       working while you are looking at another district. */
    const people = (): void => {
      const standing: Standing[] = [];
      for (const task of tasks) {
        const mood = seen[task.id];
        if (!mood || mood === 'empty') continue;
        const plot = projects.find((project) => project.id === task.project)?.plot;
        const district = plot ? drawn.districts.get(plot) : undefined;
        const building =
          district && task.slot !== null && drawn.ground.buildingAt(district, task.slot);
        if (building) standing.push({ id: task.id, building, mood });
      }
      drawn.folk.set(standing);
      paintRail();
      // The roster is a live thing: a session that starts working changes its
      // mark on the board you are looking at, without you touching anything.
      if (live && !work && !card && !naming && !titling && !looking) board.update(live.rows());
    };
    const running = new ReplicaState<Task[]>(client.tasks.all.state(undefined, 'list'), {
      onChange: (value) => {
        tasks = value;
        people();
      },
    });
    await running.ready;
    tasks = running.current() ?? [];

    const moods = new ReplicaState<Record<string, Mood>>(
      client.agents.island.state(undefined, 'moods'),
      {
        onChange: (value) => {
          seen = value;
          people();
        },
      }
    );
    await moods.ready;
    seen = moods.current() ?? {};
    people();

    /* And open on whatever you were looking at. Closing the app is not the
       same as being done with the session that was on the board, and coming
       back to a view of the whole island every time makes it feel like the app
       forgot you were in the middle of something. */
    const was = lastly();
    if (was && was.kind !== 'island') {
      retracing = true;
      try {
        await visit(was);
      } finally {
        retracing = false;
      }
      // The island stays underneath whatever you came back to, so going back
      // from a restored session is the same move it was before you closed it.
      trail = [{ kind: 'island' }, was];
      step = 1;
    }
  } catch (error) {
    say(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

function sameAim(a: Aim, b: Aim): boolean {
  if (a.district !== b.district || a.kind !== b.kind) return false;
  return a.kind !== 'building' || a.slot === (b as { slot: number }).slot;
}

/** An empty board with a cursor on it, which is all a new session is. */
function asking(naming: { district: District; written: string }): Row[] {
  return [
    { kind: 'title', text: 'a new session' },
    { kind: 'line', text: `on the ${naming.district.name.toLowerCase()}`, tone: 'faded' },
    { kind: 'gap' },
    {
      kind: 'prose',
      text: 'say what you want doing. it gets its own branch, and it will name itself.',
      tone: 'faded',
    },
    { kind: 'gap' },
    { kind: 'typed', text: naming.written },
  ];
}

/** The board, asking what to call this instead. */
function retitling(titling: { task: Task; written: string }): Row[] {
  return [
    { kind: 'title', text: titling.task.title },
    { kind: 'line', text: titling.task.branch, tone: 'faded', keep: 'tail' },
    { kind: 'gap' },
    { kind: 'line', text: 'call it what?' },
    { kind: 'typed', text: titling.written },
    { kind: 'gap' },
    {
      kind: 'line',
      text: 'return to keep it. escape clears it, again to leave it alone.',
      tone: 'faded',
    },
  ];
}

/** The mark a session wears on the rail, which is what it is doing. */
function markOf(mood: Mood | undefined): string | undefined {
  if (mood === 'working') return '…';
  if (mood === 'asking') return '?';
  if (mood === 'hurt') return '×';
  if (mood === 'arriving') return '·';
  if (mood === 'resting') return '·';
  return undefined;
}

function toneOf(mood: Mood | undefined): 'keen' | 'sore' | undefined {
  if (mood === 'asking') return 'keen';
  if (mood === 'hurt') return 'sore';
  return undefined;
}

function whyNot(error: { kind: string; because?: string; name?: string }): string {
  if (error.kind === 'refused') return error.because ?? 'the worktree was refused.';
  if (error.kind === 'taken') return 'something is already standing in that building.';
  if (error.kind === 'already-here') return `${error.name} is already standing here.`;
  if (error.kind === 'nameless') return 'a task needs a name.';
  return 'that district has no project on it.';
}

interface Drawn {
  ground: Ground;
  folk: Folk;
  /** The districts by plot, which is how a project finds its own land. */
  districts: Map<string, District>;
  island: Extent;
}

/** Compose the island for the state the app is in, and put it on screen. */
async function draw(world: Container, client: MenderClient): Promise<Drawn> {
  say('drawing the island…');
  const map = await client.village.map({});
  const scene = buildScene(new Document(map.layout).items(), map.layout);
  if (scene.missing.length) {
    console.warn(`${scene.missing.length} sprites are not in the kit`, scene.missing.slice(0, 8));
  }
  const ground = new Ground(map.districts, map.layout, scene.buildings);
  scene.root.addChildAt(ground.overlay, scene.groundTop);

  for (const old of world.removeChildren()) old.destroy({ children: true });
  world.addChild(scene.root);
  say(null);
  return {
    ground,
    folk: new Folk(ground.windows),
    districts: new Map(map.districts.map((district) => [district.id, district])),
    island: extentOf(map.layout),
  };
}

async function found(client: MenderClient, grown: () => Promise<void>): Promise<void> {
  // No deadline on this one. The call is open for exactly as long as someone is
  // looking through their folders for the right checkout, and wire's default
  // half minute is a perfectly reasonable amount of time to spend doing that.
  const result = await client.projects.found({}, { timeoutMs: 0 });
  if (result.success) {
    await grown();
    say(`${result.data.name} has moved in.`, 4000);
    return;
  }
  const error = result.error;
  if (error.kind === 'cancelled') return;
  say(
    error.kind === 'not-a-repository'
      ? 'That folder is not a checkout, so nothing can be built on it.'
      : error.kind === 'already-founded'
        ? 'There is already a district on that checkout.'
        : 'Every plot on the island is taken.',
    5000
  );
}

interface Pointing {
  at(worldX: number, worldY: number): Aim | null;
  hover(aim: Aim | null): void;
  picked(aim: Aim | null): void;
  escaped(): void;
  /** A key held with command. True if it meant something. */
  ordered(event: KeyboardEvent): boolean;
  /** A key that is not escape and not a chord. True if the board took it. */
  typed(event: KeyboardEvent): boolean;
}

/** Somewhere you have been, small enough to write down and come back to. */
type Spot =
  | { kind: 'island' }
  | { kind: 'project'; id: string }
  | { kind: 'task'; id: string; card: boolean };

function same(a: Spot | undefined, b: Spot): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === 'island') return true;
  if (a.kind === 'project') return a.id === (b as { id: string }).id;
  const other = b as { id: string; card: boolean };
  return a.id === other.id && a.card === other.card;
}

/** Where the app was when it was last closed, if it wrote it down. */
function lastly(): Spot | null {
  try {
    const kept = localStorage.getItem('mender.where');
    if (!kept) return null;
    const read = JSON.parse(kept) as Spot;
    return read.kind === 'island' || read.kind === 'project' || read.kind === 'task' ? read : null;
  } catch {
    return null;
  }
}

/**
 * Pointing, going, and writing.
 *
 * A district lights when the pointer is over it and something happens when you
 * pick it; the open sea takes you back out, and so does escape. The camera is
 * dragged with the same button, so a press that moved is a pan and not a pick —
 * without that, every drag that ends over land takes you somewhere.
 *
 * There is no text field anywhere in this app, so while the board is asking for
 * a name the keyboard simply belongs to the board.
 */
function watchPointer(
  pixi: Application,
  camera: ReturnType<typeof createCamera>,
  board: Board,
  rail: Rail,
  pointing: Pointing
): void {
  pixi.stage.eventMode = 'static';
  pixi.stage.hitArea = pixi.screen;

  let pressedAt: { x: number; y: number } | null = null;

  const under = (event: FederatedPointerEvent): Aim | null => {
    const point = camera.toWorld(event.global);
    return pointing.at(point.x, point.y);
  };
  // Land the board is standing in front of, or the rail is nailed over, is not
  // land you can point at.
  const behind = (event: FederatedPointerEvent): boolean =>
    board.over(event.global.x) || rail.over(event.global.y);

  pixi.stage.on('pointermove', (event: FederatedPointerEvent) => {
    const aim = behind(event) ? null : under(event);
    pointing.hover(aim);
    pixi.canvas.style.cursor = aim ? 'pointer' : 'default';
  });

  pixi.stage.on('pointerdown', (event: FederatedPointerEvent) => {
    pressedAt = behind(event) ? null : { x: event.global.x, y: event.global.y };
  });

  pixi.stage.on('pointerup', (event: FederatedPointerEvent) => {
    const from = pressedAt;
    pressedAt = null;
    if (!from || behind(event)) return;
    if (Math.hypot(event.global.x - from.x, event.global.y - from.y) > 4) return;
    pointing.picked(under(event));
  });

  /* One listener, and it is the only one in the app.
     Everything that reads a key reads it from here, in an order, and the first
     thing with a claim on it takes it. Two listeners on the same key is how an
     arrow ends up both walking a list and scrolling the board under it. */
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      pointing.escaped();
      event.preventDefault();
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      if (pointing.ordered(event)) event.preventDefault();
      return;
    }
    if (event.altKey) return;
    if (pointing.typed(event) || board.scrolled(event.key)) event.preventDefault();
  });
}

void boot();
