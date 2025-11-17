/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as cases from "../cases.js";
import type * as chat from "../chat.js";
import type * as comments from "../comments.js";
import type * as documents from "../documents.js";
import type * as fileExtraction from "../fileExtraction.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as router from "../router.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  auth: typeof auth;
  calendar: typeof calendar;
  cases: typeof cases;
  chat: typeof chat;
  comments: typeof comments;
  documents: typeof documents;
  fileExtraction: typeof fileExtraction;
  files: typeof files;
  http: typeof http;
  notifications: typeof notifications;
  presence: typeof presence;
  router: typeof router;
  subscriptions: typeof subscriptions;
  tasks: typeof tasks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
