export function cleanUrl(url: string): string {
  // Find the position of the question mark
  const index = url.indexOf("?");

  // If there is no question mark, return the original URL
  if (index === -1) {
    return url;
  }

  // Otherwise, return the URL up to the question mark
  return url.substring(0, index);
}
