/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { observable, reaction } from "mobx";
import { WebLink, WebLinkSpec, WebLinkStatus } from "../common/catalog-entities";
import { CatalogEntity, CatalogEntityMetadata } from "../common/catalog";
import { LensMainExtension } from "./lens-main-extension";
import { catalogEntityRegistry } from "../main/catalog";

class InvalidEntity extends CatalogEntity<CatalogEntityMetadata, WebLinkStatus, WebLinkSpec> {
   public readonly apiVersion = "entity.k8slens.dev/v1alpha1";
   public readonly kind = "Invalid";
 
   async onRun() {
     return;
   }
 
   public onSettingsOpen(): void {
     return;
   }
 
   public onDetailsOpen(): void {
     return;
   }
 
   public onContextMenuOpen(): void {
     return;
   }
}
 
describe("LensMainExtension", () => {
  let lensMainExtension: LensMainExtension;
  const entity = new WebLink({
    metadata: {
      uid: "test",
      name: "test-link",
      source: "test",
      labels: {}
    },
    spec: {
      url: "https://k8slens.dev"
    },
    status: {
      phase: "available"
    }
  });
  const invalidEntity = new InvalidEntity({
    metadata: {
      uid: "invalid",
      name: "test-link",
      source: "test",
      labels: {}
    },
    spec: {
      url: "https://k8slens.dev"
    },
    status: {
      phase: "available"
    }
  });
 
  beforeEach(() => {
    lensMainExtension = new LensMainExtension({
      id: "lens-main-extension-test",
      absolutePath: "",
      manifestPath: "",
      isBundled: false,
      isCompatible: true,
      isEnabled: true,
      manifest: {
        name: "",
        version: "",
      },
    });
  });
 
  describe("LensMainExtension.addCatalogSource", () => {
    it ("allows to add an observable source", () => {
      const source = observable.array([]);
 
      lensMainExtension.addCatalogSource("test", source);
      expect(catalogEntityRegistry.items.length).toEqual(0);
 
      source.push(entity);
 
      expect(catalogEntityRegistry.items.length).toEqual(1);
    });
 
    it ("can mutate entity", () => {
      const source = observable.array([]);
 
      lensMainExtension.addCatalogSource("test", source);
      source.push(entity);
       
      const index = source.findIndex((i) => i.metadata.uid === entity.metadata.uid);
 
      const updateEntity = new WebLink({
        metadata: {
          uid: "test",
          name: "test-link",
          source: "test",
          labels: {}
        },
        spec: {
          url: "https://k8slens.dev"
        },
        status: {
          phase: "unavailable"
        }
      });
 
      source.splice(index, 1, updateEntity);
      expect(catalogEntityRegistry.items.length).toEqual(1);
 
      const found = catalogEntityRegistry.items.find((i) => i.metadata.uid === updateEntity.metadata.uid);
 
      expect(found).toBeDefined();
      expect(found.status.phase).toBe("unavailable");
    });
 
    it ("added source change triggers reaction", (done) => {
      const source = observable.array([]);
 
      lensMainExtension.addCatalogSource("test", source);
      reaction(() => catalogEntityRegistry.items, () => {
        done();
      });
 
      source.push(entity);
    });
  });
 
  describe("LensMainExtension.removeCatalogSource", () => {
    it ("removes source", () => {
      const source = observable.array([]);
 
      lensMainExtension.addCatalogSource("test", source);
      source.push(entity);
      lensMainExtension.removeCatalogSource("test");
 
      expect(catalogEntityRegistry.items.length).toEqual(0);
    });
  });
 
  describe("items", () => {
    it("returns added items", () => {
      expect(catalogEntityRegistry.items.length).toBe(0);
 
      const source = observable.array([entity]);
 
      lensMainExtension.addCatalogSource("test", source);
      expect(catalogEntityRegistry.items.length).toBe(1);
    });
 
    it("does not return items without matching category", () => {
      const source = observable.array([invalidEntity]);
 
      lensMainExtension.addCatalogSource("test", source);
      expect(catalogEntityRegistry.items.length).toBe(0);
    });
  });
});
 