/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, css} from 'lit';

import {customElement, property} from 'lit/decorators.js';

async function getHash(text: string): Promise<string> {
  // Convert the input text to an array of bytes
  const textBytes = new TextEncoder().encode(text);
  // Calculate the hash of the input text
  const hash = await window.crypto.subtle.digest('SHA-256', textBytes);
  // Wait for the Promise returned by digest() to be resolved
  // Convert the hash to a hexadecimal string
  // Probably unnecessary
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export interface PendingStateDetail {
  promise: Promise<void>;
}

export type PendingStateEvent = CustomEvent<PendingStateDetail>;

export function newPendingStateEvent(
  promise: Promise<void>,
  eventInitDict?: CustomEventInit<Partial<PendingStateDetail>>
): PendingStateEvent {
  return new CustomEvent<PendingStateDetail>('pending-state', {
    bubbles: true,
    composed: true,
    ...eventInitDict,
    detail: {promise, ...eventInitDict?.detail},
  });
}

@customElement('my-element')
export class MyElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }
  `;

  /**
   * The number of times the button has been clicked.
   */
  @property({type: Number})
  count = 0;

  @property()
  xmlDoc: Document | null = null;

  @property({attribute: false})
  reHash: string[] = [];

  @property({attribute: false})
  previousDepth = 0;

  @property({attribute: false})
  qtyAtDepth = 0;

  @property({attribute: false})
  hashTable = new Map();

  @property({attribute: false})
  depthTracker = new Map();

  async nodeHash(node: Element): Promise<string> {
    for (const name of node.getAttributeNames()) {
      const value = node.getAttribute(name);
      console.log(name, value);
    }

    const attrs = node.getAttributeNames().map((name) => {
      return `${name}=${node.getAttribute(name)}`;
    });

    let contentText;
    if (node.firstChild?.nodeType === Node.TEXT_NODE) {
      contentText = node.firstChild.textContent;
    }
    const content = `${node.tagName}: ${attrs} ${contentText}`;
    return await getHash(content);
  }

  async postOrderTraversal(node: Element, currentDepth = 0) {
    // Traverse the tree leaves first
    for (const child of node.children) {
      await this.postOrderTraversal(child, currentDepth + 1);
    }

    // calculate hash for current node, excluding children
    let nodeHash = await this.nodeHash(node);

    // check how many are at the current depth
    if (currentDepth === this.previousDepth) this.depthTracker.set(currentDepth, this.qtyAtDepth++);

    // add hash to list of hashes to hash together for higher level nodes
    this.reHash = this.reHash.concat(nodeHash);

    // we are now traversing upwards, we must hash the children and this node and store the result
    if (this.previousDepth > currentDepth && this.reHash.length !== 0) {
      console.log(this.reHash, 'HASHING THE HECK');
      const combinedHash =  await getHash(this.reHash.slice(this.depthTracker.get(currentDepth)).join('').concat(nodeHash)) 

      this.reHash = [combinedHash];
      nodeHash = combinedHash;

      // reset tracking metadata
      this.qtyAtDepth = 0;
    }

    // add to index
    if (this.hashTable.has(nodeHash)) {
      const existingValues = this.hashTable.get(nodeHash);
      this.hashTable.set(nodeHash, [existingValues].concat(node));
    } else {
      this.hashTable.set(nodeHash, node);
    }

    // Log the node name and depth of this element
    console.log(
      `${node.nodeName} (depth ${currentDepth}) (qtyAtDepth ${
        this.qtyAtDepth
      }) ${this.reHash.map((h) => h.slice(0, 8))} depthTracker: ${this.depthTracker}`
    );

    this.previousDepth = currentDepth;
  }

  override render() {
    return html`
      <h1>We hash our rehashing quite slowly</h1>
      <input
        id="compare-file-1"
        accept=".sed,.scd,.ssd,.isd,.iid,.cid,.icd,.xml"
        type="file"
        required
        @change=${(evt: Event) =>
          this.dispatchEvent(newPendingStateEvent(this.getCompareFile(evt)))}
      />
      <button @click=${this._onClick} part="button">Let's do stuff!</button>
      <slot></slot>
    `;
  }

  private async _onClick() {
    console.log('Now we compare');

    const firstDocEl = this.xmlDoc!.documentElement;
    await this.postOrderTraversal(firstDocEl);

    this.hashTable.forEach((v, k) =>
      console.log(`${k.slice(0, 8)}: ${v.tagName}`)
    );
  }

  private async getCompareFile(evt: Event): Promise<void> {
    const file = (<HTMLInputElement | null>evt.target)?.files?.item(0) ?? false;
    if (!file) return;

    const templateText = await file.text();
    const compareDoc = new DOMParser().parseFromString(
      templateText,
      'application/xml'
    );

    this.xmlDoc = compareDoc;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement;
  }
}
