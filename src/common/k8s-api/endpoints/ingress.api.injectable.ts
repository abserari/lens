/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import assert from "assert";
import { storesAndApisCanBeCreatedInjectionToken } from "../stores-apis-can-be-created.token";
import { IngressApi } from "./ingress.api";

const ingressApiInjectable = getInjectable({
  id: "ingress-api",
  instantiate: (di) => {
    assert(di.inject(storesAndApisCanBeCreatedInjectionToken), "ingressApi is only available in certain environments");

    return new IngressApi();
  },
});

export default ingressApiInjectable;
