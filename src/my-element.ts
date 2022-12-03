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
  return window.crypto.subtle.digest('SHA-256', textBytes).then((hash) => {
    // Convert the hash to a hexadecimal string
    // Probably unnecessary
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

/** @returns whether `a` and `b` are considered identical by IEC-61850 */
export function isSame(a: Element, b: Element): boolean {
  if (a.tagName === 'Private')
    return isSame(a.parentElement!, b.parentElement!) && a.isEqualNode(b);
  return a.tagName === b.tagName;
  // && identity(a) === identity(b);
}

export function isEqual(a: Element, b: Element): boolean {
  if (a.closest('Private') || b.closest('Private')) return a.isEqualNode(b);

  const attributeNames = new Set(
    a.getAttributeNames().concat(b.getAttributeNames())
  );
  for (const name of attributeNames)
    if (a.getAttribute(name) !== b.getAttribute(name)) return false;

  if (a.childElementCount === 0)
    return (
      b.childElementCount === 0 &&
      a.textContent?.trim() === b.textContent?.trim()
    );

  const aChildren = Array.from(a.children);
  const bChildren = Array.from(b.children);

  for (const aChild of aChildren) {
    const twindex = bChildren.findIndex((bChild) => isEqual(aChild, bChild));
    if (twindex === -1) return false;
    bChildren.splice(twindex, 1);
  }

  for (const bChild of bChildren)
    if (!aChildren.find((aChild) => isEqual(bChild, aChild))) return false;

  return true;
}

// define the compareNodes() function
function compareNodes(element1: Element, element2: Element): Element[] {
  // iterate over the child nodes of the first XML document
  const diffs = [];
  for (const child1 of element1.children) {
    // find the corresponding child in the second XML document
    const child2index = Array.from(element2.children).findIndex((ourChild) =>
      isEqual(child1, ourChild)
    );
    const child2 = Array.from(element2.children)[child2index];

    // compare the child nodes
    const childDiffs: Element[] = compareNodes(child1, child2);
    if (childDiffs.length > 0) {
      diffs.push(...childDiffs);
    }
  }

  return diffs;
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

/**
 * An example element.
 *
 * @fires count-changed - Indicates when the count changes
 * @slot - This element has a slot
 * @csspart button - The button
 */
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
   * The name to say "Hello" to.
   */
  @property()
  name = 'World';

  /**
   * The number of times the button has been clicked.
   */
  @property({type: Number})
  count = 0;

  @property()
  documents: Document[] = [];

  override render() {
    return html`
      <h1>${this.sayHello(this.name)}!</h1>
      <input
        id="compare-file-1"
        accept=".sed,.scd,.ssd,.isd,.iid,.cid,.icd"
        type="file"
        required
        @change=${(evt: Event) =>
          this.dispatchEvent(newPendingStateEvent(this.getCompareFile(evt)))}
      />
      <input
        id="compare-file-1"
        accept=".sed,.scd,.ssd,.isd,.iid,.cid,.icd"
        type="file"
        required
        @change=${(evt: Event) =>
          this.dispatchEvent(newPendingStateEvent(this.getCompareFile(evt)))}
      />
      <button @click=${this._onClick} part="button">
        Click Count: ${this.count}
      </button>
      <slot></slot>
    `;
  }

  private _onClick() {
    this.count++;
    this.dispatchEvent(new CustomEvent('count-changed'));
    if (this.documents.length === 1) {
      console.log('Now we compare');

      // compare the root nodes of the XML documents
      const firstDocEl = this.documents[0].documentElement;
      // const secondDocEl = this.documents[0].documentElement;

      // console.log(firstDocEl, secondDocEl);
      // const diffs = compareNodes(firstDocEl, secondDocEl);

      // // check the result to see if the documents are the same or different
      // if (diffs.length === 0) {
      //   // the documents are the same
      //   console.log('the documents are the same');
      // } else {
      //   console.log('the documents are different');
      //   console.log(diffs);
      // }

      const res = postOrderTraversal(firstDocEl);
      console.log(res);
      console.log(reHash)
    }

    // const hashTable = new Map();

    //   const startTime = Date.now();

    //     getHash(text).then(result => {
    //       hashTable.set(i,result)
    //     });

    //   const endTime = Date.now();
    //   console.log(`Input length: ${length}`);
    //   console.log(`Duration: ${(endTime-startTime) / 1000} seconds`);
  }

  /**
   * Formats a greeting
   * @param name The name to say "Hello" to
   */
  sayHello(name: string): string {
    return `Hello, ${name}`;
  }

  private async getCompareFile(evt: Event): Promise<void> {
    const file = (<HTMLInputElement | null>evt.target)?.files?.item(0) ?? false;
    if (!file) return;

    const templateText = await file.text();
    const compareDoc = new DOMParser().parseFromString(
      templateText,
      'application/xml'
    );

    this.documents.push(compareDoc);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement;
  }
}

let reHash: string[] = [];
let depthTracker  = 0;

function postOrderTraversal(node: Element, currentDepth = 0) {
  // Recursively traverse the children of this node
  for (const child of node.children) {
    postOrderTraversal(child, currentDepth + 1);
  }

  // Log the node name and depth of this element
  console.log(`${node.nodeName} (depth ${currentDepth})`);
  reHash = reHash.concat(node.tagName);
  if (depthTracker > currentDepth) {
    reHash = reHash.concat('HashMyFriends');
  }
  depthTracker = currentDepth
}

// function postOrderTraversal(node: Element, depth = 0): void {
//   const node_left = Array.from(node.children)[0] || null;
//   if (node_left !== null) {
//     // for (const child of node_left.children) {
//       postOrderTraversal(node_left, depth + 1);
//     // }
//   }
//   const node_right = Array.from(node.children).slice(1) || null;
//   if (node_right !== null) {
//     node_right.forEach((child) => {
//       postOrderTraversal(child, depth + 1);
//     });
//   }
//   console.log(`${node.nodeName} (depth ${depth})`);
// }

// function postOrderTraversal(node:Element): Element[]{
//   if (node.children.length === 0) {
//     return [node];
//   } else {
//     let arr: Element[]= [];
//     for (let i = 0; i < node.children.length; i++) {
//       const childValues = postOrderTraversal(node.children[0]);
//       arr = arr.concat(childValues);
//     }
//     arr.push(node);
//     return arr;
//   }
// }
