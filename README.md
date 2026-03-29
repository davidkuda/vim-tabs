# VimTabs

VimTabs is a keyboard-first browser tab manager inspired by Vim-style workflows.

The product is built around an in-page overlay experience. By default, VimTabs opens directly on top of the current page so you can manage tabs without leaving your browsing context.

You can still switch to a standalone extension-page mode in settings if you prefer, but the overlay is the primary experience.

## Permissions

VimTabs uses the smallest set of permissions needed to provide its overlay-first experience.

### Required permissions

- `tabs`
  Justification: VimTabs needs to list tabs, move them, close them, focus them, and create new ones as part of tab management.

- `bookmarks`
  Justification: VimTabs supports bookmarking the selected tab directly from the keyboard manager.

- `storage`
  Justification: VimTabs stores settings, marks, and stashed tab sessions locally in the browser.

- `scripting`
  Justification: VimTabs uses this to inject its overlay UI into the currently open page. This is required because the overlay is the default product experience.

- `<all_urls>` host permission
  Justification: Chrome requires host access to inject the overlay scripts and styles into arbitrary websites. VimTabs needs this because it is designed to work as an in-page overlay regardless of the current site.

## Security and UX trade-off

VimTabs prioritizes the overlay experience over a least-privilege install. That means it requests the permissions needed to inject its UI into pages by default.

This is a deliberate trade-off:

- Better UX: instant, in-context overlay on top of the current page
- Higher trust requirement: VimTabs needs permission to inject into websites

If you want a less intrusive workflow, you can switch to standalone page mode in settings, but the extension still keeps the broader permissions because overlay mode remains part of the product.

## Data stored locally

VimTabs stores the following data in `chrome.storage.local`:

- settings
- marks
- stashed tab sessions

This data stays local to the extension unless you export or sync it through browser features outside VimTabs.
