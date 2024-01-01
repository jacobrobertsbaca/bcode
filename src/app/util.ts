import { trimEnd } from "lodash";

/**
 * If `url` is not a valid url, returns `url`.
 * Otherwise, returns a minified version of `url` which is guaranteed not to end in a slash.
 */
export function minifyURL(url: string) {
  try {
    const parsed = new URL(url);
    url = `${parsed.host}${parsed.pathname}`;
    return trimEnd(url, "/");
  } catch (err: any) {
    console.log(err);
    return url;
  }
}

/**
 * Whether or not we are running in production.
 * @returns `true` in a production build, `false` otherwise.
 */
export function prod() {
  return process.env.NODE_ENV === "production";
}