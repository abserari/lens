/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { InputProps } from "./input";
import type React from "react";
import fse from "fs-extra";
import { TypedRegEx } from "typed-regex";
import type { SetRequired } from "type-fest";

export type InputValidationResult<IsAsync extends boolean> =
  IsAsync extends true
    ? Promise<void>
    : boolean;

export type InputValidation<IsAsync extends boolean> = (value: string, props?: InputProps) => InputValidationResult<IsAsync>;

export type SyncValidationMessage = React.ReactNode | ((value: string, props?: InputProps) => React.ReactNode);

export type InputValidator<IsAsync extends boolean = boolean> = {
  /**
   * Filters itself based on the input props
   */
  condition?: (props: InputProps) => any;
} & (
  IsAsync extends true
    ? {
      /**
       * The validation message maybe either specified from the `message` field (higher priority)
       * or if that is not provided then the message will retrived from the rejected with value
       */
      validate: InputValidation<true>;
      message?: SyncValidationMessage;
      debounce: number;
    }
    : {
      validate: InputValidation<false>;
      message: SyncValidationMessage;
      debounce?: undefined;
    }
  );

export function isAsyncValidator(validator: InputValidator<boolean>): validator is InputValidator<true> {
  return typeof validator.debounce === "number";
}

export function asyncInputValidator(validator: InputValidator<true>): InputValidator<true> {
  return validator;
}

export function inputValidator(validator: InputValidator<false>): InputValidator<false> {
  return validator;
}

/**
 * Create a new input validator from a list of syncronous input validators. Will match as valid if
 * one of the input validators matches the input
 */
export function unionInputValidators(
  baseValidator: Pick<InputValidator<false>, "condition" | "message">,
  ...validators: InputValidator<false>[]
): InputValidator<false> {
  return inputValidator({
    ...baseValidator,
    validate: (value, props) => validators.some(validator => validator.validate(value, props)),
  });
}

/**
 * Create a new input validator from a list of syncronous or async input validators. Will match as
 * valid if one of the input validators matches the input
 */
export function unionInputValidatorsAsync(
  baseValidator: SetRequired<Pick<InputValidator<boolean>, "condition" | "message">, "message">,
  ...validators: InputValidator<boolean>[]
): InputValidator<true> {
  const longestDebounce = Math.max(
    ...validators
      .filter(isAsyncValidator)
      .map(validator => validator.debounce),
    0,
  );

  return asyncInputValidator({
    debounce: longestDebounce,
    validate: async (value, props) => {
      for (const validator of validators) {
        if (isAsyncValidator(validator)) {
          try {
            await validator.validate(value, props);

            return;
          } catch {
            // Do nothing
          }
        } else {
          if (validator.validate(value, props)) {
            return;
          }
        }
      }

      /**
       * If no validator returns `true` then mark as invalid by throwing. The message will be
       * obtained from the `message` field.
       */
      throw new Error();
    },
    ...baseValidator,
  });
}

export const isRequired = inputValidator({
  condition: ({ required }) => required,
  message: () => `This field is required`,
  validate: value => !!value.trim(),
});

export const isEmail = inputValidator({
  condition: ({ type }) => type === "email",
  message: () => `Wrong email format`,
  validate: value => !!value.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/),
});

export const isNumber = inputValidator({
  condition: ({ type }) => type === "number",
  message(value, { min, max } = {}) {
    const minMax: string = [
      typeof min === "number" ? `min: ${min}` : undefined,
      typeof max === "number" ? `max: ${max}` : undefined,
    ].filter(Boolean).join(", ");

    return `Invalid number${minMax ? ` (${minMax})` : ""}`;
  },
  validate: (value, { min, max } = {}) => {
    const numVal = +value;

    return !(
      isNaN(numVal) ||
      (min != null && numVal < min) ||
      (max != null && numVal > max)
    );
  },
});

export const isUrl = inputValidator({
  condition: ({ type }) => type === "url",
  message: () => `Wrong url format`,
  validate: value => {
    try {
      return Boolean(new URL(value));
    } catch (err) {
      return false;
    }
  },
});

/**
 * NOTE: this cast is needed because of two bugs in the typed regex package
 * - https://github.com/phenax/typed-regex/issues/6
 * - https://github.com/phenax/typed-regex/issues/7
 */
export const isExtensionNameInstallRegex = TypedRegEx("^(?<name>(@[-\\w]+\\/)?[-\\w]+)(@(?<version>[a-z0-9-_.]+))?$", "gi") as {
  isMatch(val: string): boolean;
  captures(val: string): undefined | { name: string; version?: string };
};

export const isExtensionNameInstall = inputValidator({
  condition: ({ type }) => type === "text",
  message: () => "Not an extension name with optional version",
  validate: value => isExtensionNameInstallRegex.isMatch(value),
});

export const isPath = asyncInputValidator({
  debounce: 100,
  condition: ({ type }) => type === "text",
  validate: async value => {
    if (!await fse.pathExists(value)) {
      throw new Error(`"${value}" is not a valid file path`);
    }
  },
});

export const minLength = inputValidator({
  condition: ({ minLength }) => !!minLength,
  message: (value, { minLength = 0 } = {}) => `Minimum length is ${minLength}`,
  validate: (value, { minLength = 0 } = {}) => value.length >= minLength,
});

export const maxLength = inputValidator({
  condition: ({ maxLength }) => !!maxLength,
  message: (value, { maxLength = 0 } = {}) => `Maximum length is ${maxLength}`,
  validate: (value, { maxLength = 0 } = {}) => value.length <= maxLength,
});

const systemNameMatcher = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

export const systemName = inputValidator({
  message: () => `A System Name must be lowercase DNS labels separated by dots. DNS labels are alphanumerics and dashes enclosed by alphanumerics.`,
  validate: value => !!value.match(systemNameMatcher),
});

export const accountId = inputValidator({
  message: () => `Invalid account ID`,
  validate: (value) => (isEmail.validate(value) || systemName.validate(value)),
});

export const conditionalValidators = [
  isRequired, isEmail, isNumber, isUrl, minLength, maxLength,
];
