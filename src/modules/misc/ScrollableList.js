class ScrollableList extends HTMLDivElement {
    scrollableListTemplate = window.document.getElementById('scrollableListTemplate');

    constructor() {
        super();
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.append(this.scrollableListTemplate.content.cloneNode(true));
    }
}
