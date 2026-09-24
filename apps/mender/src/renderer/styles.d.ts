/**
 * A stylesheet imported for its side effect.
 *
 * Vite turns `import './x.css'` into a link on the page. TypeScript has no idea
 * what a stylesheet is, so this says: nothing comes back, it is there for what
 * it does to the document.
 */
declare module '*.css';
