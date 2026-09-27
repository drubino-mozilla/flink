## Flink Extension Overview

This extension is your comprehensive solution for copying links... or it will be one day as its feature set expands. Ideally, we'll get some of this functionality built into Firefox, but for now, this extension serves as a playground.

The **Flink** address bar button simply copies the URL to the clipboard as is. If you right-click, you'll see this option repeated, and then you'll also see up to three additional options:

### Copy Title
The page title is used for the label for the link. This looks for the OpenGraph title on the page if there is one, and if there isn't one, it uses the HTML title of the page.

### Copy Selection Link
If there is selected text on the page, that selected text is used as the label for the link.

### Copy Flink
This option is offered only for specific sites where I've authored support for extracting elements from the page.

- **Google Docs** use the document name: [Product Change Proposal April 2025]()
- **Jira Tickets** use the key as a link, followed by the title in quotes: [TR-1234](): "Complete product specification and get review"
- **Bugzilla Bugs** use the ID as the link, followed by the title in quotes: [1234567](): "Firefox crashes when playing multiple videos in the same tab"
- **GitHub Issues** use the repo and issue number as context: [nicudo/portio] [Issue #16627](): "Class fields are not transformed correctly when targeting ES2022"
- **GitHub PRs** use the repo and PR number as context: [nicudo/portio] [PR #16645](): "Fix class field ordering with decorators"
- **Experimenter** experiments and rollouts use the slug: [default-new-users-to-launch-firefox-when-windows-starts-rollout]()
- **Wikipedia Articles** use the article name: [Pulitzer Prize]()
- **Slack Messages** use sender, date, and channel context (right-click a message timestamp on app.slack.com): [Slack message from Venetia Tay on Jun 12 in #desktop-integrations]()

The above are formats copied to the HTML clipboard. Each link type also has a bespoke layout for the plain text clipboard:

- **Google Docs**: `"Product Change Proposal April 2025" (https://docs.google.com/document/d/1KvfJgi6he_AD-2wKGpPHfv25e15jab6MI5VvWrA/edit)`
- **Jira Tickets**: `https://mozilla-hub.atlassian.net/browse/TR-1234: "Complete product specification and get review"`
- **Bugzilla Bugs**: `https://bugzilla.mozilla.org/show_bug.cgi?id=1234567: "Firefox crashes when playing multiple videos in the same tab"`
- **GitHub Issues**: `https://github.com/nicudo/portio/issues/16627: "Class fields are not transformed correctly when targeting ES2022"`
- **GitHub PRs**: `https://github.com/nicudo/portio/pull/16645: "Fix class field ordering with decorators"`
- **Experimenter**: `https://experimenter.services.mozilla.com/nimbus/rollouts/default-new-users-to-launch-firefox-when-windows-starts-rollout/`
- **Wikipedia Articles**: `https://en.wikipedia.org/wiki/Pulitzer_Prize`
- **Slack Messages**: `Slack message from Venetia Tay on Jun 12 in #desktop-integrations: https://mozilla.slack.com/archives/C04SV4DAXL7/p1779479765942139`

## Future Feature Ideas

A lot more could be done! Please file issues here and I will see them. I am also responsive to email at [flink@joivid.com](mailto:flink@joivid.com) and happy to chat.

1. The way I choose to format links, whether for title, selection, or my site-specific support, is my preference, but I could make it configurable.
2. I could support more sites for flinks. Let me know your requests, and I will do it.
3. I could create a way to specify formatting using JSON and download formatting definitions from a server instead of baking them into code.
4. Users could locally choose which definitions are enabled and create their own locally as well.
5. With this model, formatting definitions could be contributed by users.
6. I could offer ways to deep link into pages using URL fragments based on the selection, including text fragments.
7. For sites that provide lists of links, I could extract the links (e.g., search results, query results, folder listings).
8. Options to right-click on a link in a page and choose to copy it instead of just supporting the address bar button.
9. Multiple links could be added one at a time to the clipboard across multiple pages.
10. I could build a previewer UI, so you can always see what was actually placed on the clipboard.
