import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles.css';
import { ENGINE_VERSION } from '../engine';

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function renderShell(root: HTMLElement): void {
    const main = el('main', 'mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center');

    const title = el('h1', 'text-4xl font-bold');
    title.append(el('i', 'fa-solid fa-dungeon mr-3 text-warning'), 'Karak');

    main.append(
        title,
        el('p', 'opacity-80', 'Project shell. The playable hot-seat game arrives in Phase 4.'),
        el('span', 'badge badge-outline', `engine v${ENGINE_VERSION}`),
    );
    root.replaceChildren(main);
}

const root = document.getElementById('app');
if (!root) throw new Error('#app element missing from index.html');
renderShell(root);
