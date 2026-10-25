/** Tiny DOM builder. Strings always become text nodes, so user text can never inject markup. */

export type Child = Node | string | number | null | undefined | false;

export interface Props {
    class?: string;
    title?: string;
    style?: string;
    attrs?: Record<string, string>;
    disabled?: boolean;
    onClick?: (e: MouseEvent) => void;
}

export function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Props = {},
    ...children: Child[]
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (props.class) el.className = props.class;
    if (props.title) el.title = props.title;
    if (props.style) el.setAttribute('style', props.style);
    for (const [k, v] of Object.entries(props.attrs ?? {})) el.setAttribute(k, v);
    if (props.disabled) el.setAttribute('disabled', '');
    const onClick = props.onClick;
    if (onClick) el.addEventListener('click', (e) => onClick(e as MouseEvent));
    append(el, children);
    return el;
}

export function append(el: Element, children: Child[]): void {
    for (const child of children) {
        if (child === null || child === undefined || child === false) continue;
        el.append(child instanceof Node ? child : String(child));
    }
}

export function icon(name: string, extra = ''): HTMLElement {
    return h('i', { class: `fa-solid ${name} ${extra}`.trim(), attrs: { 'aria-hidden': 'true' } });
}

export function img(src: string, alt: string, cls = ''): HTMLImageElement {
    return h('img', { class: cls, attrs: { src, alt, draggable: 'false' } });
}

export function button(
    label: Child | Child[],
    onClick: () => void,
    cls = 'btn btn-sm',
    title?: string,
): HTMLButtonElement {
    const kids = Array.isArray(label) ? label : [label];
    return h(
        'button',
        { class: cls, onClick: () => onClick(), ...(title ? { title } : {}) },
        ...kids,
    );
}
