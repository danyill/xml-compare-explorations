/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, css} from 'lit';

import {customElement, property} from 'lit/decorators.js';

function filterByDifference(
  array1: Element[],
  array2: Element[]
): [Element[], Element[]] {
  const onlyInA = differenceInFirstArray(array1.flat(), array2.flat());
  const onlyInb = differenceInFirstArray(array2.flat(), array1.flat());
  return [onlyInA, onlyInb];
}

function differenceInFirstArray(array1: Element[], array2: Element[]) {
  return array1.filter(function (current) {
    return (
      array2.filter(function (current_b) {
        return current_b.isEqualNode(current);
      }).length == 0
    );
  });
}

// function getMapValues(
//   map: Map<string, Element | Element[]>,
//   key: string
// ) {
//   if (map.get(key)!.constructor.name === 'Element') {
//     return map.get(key)!
//   } else {
//     (<Element[]>map.get(key)!).forEach((arrItem) => {
//       console.log(arrItem);
//     });
//   }
// }

function compareMaps(
  map1: Map<string, Element[] | Element>,
  map2: Map<string, Element[] | Element>
) {
  const sameKeyDifferentValues = [];
  const onlyIn1 = [];
  const onlyIn2 = [];
  for (const key of map1.keys()) {
    if (map2.has(key)) {
      if (Array.isArray(map1.get(key)!) || Array.isArray(map2.get(key)!))
        // if (map1.get(key) !== map2.get(key)) {
        sameKeyDifferentValues.push(
          filterByDifference(
            [...(<Element[]>map1.get(key))],
            [...(<Element[]>map2.get(key))]
          )
        );
      // }
    } else {
      onlyIn1.push(map1.get(key));
    }
  }
  for (const key of map2.keys()) {
    if (!map1.has(key)) {
      onlyIn2.push(map2.get(key));
    }
  }
  console.log('Same key, different values');
  console.log(sameKeyDifferentValues);
  console.log('only in 1');
  console.log(onlyIn1);
  console.log('only in 2');
  console.log(onlyIn2);
}



function getHash(text: string): string {
      let h1 = 0xdeadbeef,
        h2 = 0x41c6ce57;
      for (let i = 0, ch; i < text.length; i++) {
        ch = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 =
        Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
        Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 =
        Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
        Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return '' + ((h2 >>> 0).toString(16).padStart(8, '0') +
            (h1 >>> 0).toString(16).padStart(8, '0'))
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
  xmlDoc: Document[] = [];

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

  nodeHash(node: Element): string {
    // for (const name of node.getAttributeNames()) {
    //   const value = node.getAttribute(name);
    //   console.log(name, value);
    // }

    const attrs = node.getAttributeNames().map((name) => {
      return `${name}=${node.getAttribute(name)}`;
    });

    let contentText;
    if (node.firstChild?.nodeType === Node.TEXT_NODE) {
      contentText = node.firstChild.textContent;
    }
    const content = `${node.tagName}: ${attrs} ${contentText}`;
    return getHash(content);
  }

  postOrderTraversal(node: Element, currentDepth = 0) {
    // Traverse the tree leaves first
    for (const child of node.children) {
      this.postOrderTraversal(child, currentDepth + 1);
    }

    // calculate hash for current node, excluding children
    let nodeHash = this.nodeHash(node);

    // check how many are at the current depth
    // if (currentDepth === this.previousDepth)
    this.depthTracker.set(currentDepth, this.qtyAtDepth++);

    // add hash to list of hashes to hash together for higher level nodes
    this.reHash = this.reHash.concat(nodeHash);

    // we are now traversing upwards, we must hash the children and this node and store the result
    if (this.previousDepth > currentDepth && this.reHash.length !== 0) {
      // console.log(this.reHash, 'HASHING THE HECK');
      const combinedHash = getHash(
        this.reHash
          .slice(this.depthTracker.get(currentDepth))
          .join('')
          .concat(nodeHash)
      );

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
    // console.log(
    //   `${node.nodeName} (depth ${currentDepth}) (qtyAtDepth ${
    //     this.qtyAtDepth
    //   }) ${this.reHash.map((h) => h.slice(0, 8))} depthTracker`
    // );
    // this.depthTracker.forEach((k, v) => {
    //   console.log(`key: ${k} value: ${v}`);
    // });

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
      <input
        id="compare-file-2"
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

  hashInit() {
    this.reHash = [];
    this.previousDepth = 0;
    this.qtyAtDepth = 0;
    this.hashTable = new Map();
    this.depthTracker = new Map();
  }

  private _onClick() {
    if (this.xmlDoc!.length === 2) {
      console.log('Now we compare');

      const startTime = performance.now();

      const firstDocEl = this.xmlDoc![0].documentElement;
      this.hashInit();
      this.postOrderTraversal(firstDocEl);
      const firstDocHashes = new Map(this.hashTable);

      this.hashInit();
      const secondDocEl = this.xmlDoc![1].documentElement;
      this.postOrderTraversal(secondDocEl);
      // this.hashTable.forEach((v, k) =>
      //   console.log(`${k.slice(0, 8)}: ${v.tagName}`)
      // );
      const secondDocHashes = new Map(this.hashTable);

      const endTime = performance.now();
      // Calculate the duration of the function
      const duration = endTime - startTime;
      console.log(duration);

      compareMaps(firstDocHashes, secondDocHashes);
    }
  }

  private async getCompareFile(evt: Event): Promise<void> {
    const file = (<HTMLInputElement | null>evt.target)?.files?.item(0) ?? false;
    if (!file) return;

    const templateText = await file.text();
    const compareDoc = new DOMParser().parseFromString(
      templateText,
      'application/xml'
    );

    this.xmlDoc?.push(compareDoc);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement;
  }
}
