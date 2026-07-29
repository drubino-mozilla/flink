/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Author: David Rubino
 */

let lastRightClickedTimestamp = null;

document.addEventListener('contextmenu', (e) => {
    const tsLink = e.target.closest('a.c-timestamp');
    lastRightClickedTimestamp = tsLink;
});

function getSlackContext() {
    if (!lastRightClickedTimestamp) return null;

    const dataTs = lastRightClickedTimestamp.getAttribute('data-ts');
    if (!dataTs) return null;

    // Find sender by walking up to the message container
    let sender = null;
    let msgContainer = lastRightClickedTimestamp.closest('[data-qa="virtual-list-item"]');

    if (msgContainer) {
        let senderEl = msgContainer.querySelector('[data-qa="message_sender_name"]');

        // Compact gutter: consecutive messages from the same sender hide the name.
        // Walk backwards through sibling list items until we find one with a sender.
        if (!senderEl) {
            let sibling = msgContainer.previousElementSibling;
            while (sibling) {
                senderEl = sibling.querySelector('[data-qa="message_sender_name"]');
                if (senderEl) break;
                sibling = sibling.previousElementSibling;
            }
        }

        if (senderEl) {
            sender = senderEl.textContent.trim();
        }
    }

    // Identify the channel from the message's own permalink. Reading the page
    // header instead breaks in Later, Activity, and thread flexpanes, which
    // either have no channel header or show one for a different view.
    const idMatch = (lastRightClickedTimestamp.getAttribute('href') || '').match(/\/archives\/([A-Z0-9]+)\//);
    const channel = resolveChannel(idMatch ? idMatch[1] : null);

    return { sender, dataTs, channelName: channel.name, channelType: channel.type };
}

// Resolve a channel id to a name and type, preferring an inline channel entity
// (how thread flexpanes label the channel) over the channel view header.
// Returns type 'unknown' when the channel cannot be identified, so that callers
// can leave the channel out rather than guessing.
function resolveChannel(channelId) {
    if (channelId) {
        const entities = document.querySelectorAll('[data-channel-id="' + channelId + '"]');
        for (const entity of entities) {
            const icon = entity.querySelector('[data-inline-channel-type-icon]');
            const nameEl = entity.querySelector('[data-qa="inline_channel_entity__name"]');
            if (icon && nameEl) {
                return {
                    name: nameEl.textContent.trim(),
                    type: icon.getAttribute('data-inline-channel-type-icon') === 'lock-filled' ? 'private' : 'public'
                };
            }
        }
    }

    const headerButton = document.querySelector('[data-qa="channel_name_button"]');
    const channelNameEl = document.querySelector('[data-qa="channel_name"]');
    if (!headerButton || !channelNameEl) {
        return { name: '', type: 'unknown' };
    }

    const titleSpan = channelNameEl.querySelector('.p-view_header__channel_title');
    const name = titleSpan ? titleSpan.textContent.trim() : channelNameEl.textContent.trim();

    if (headerButton.classList.contains('p-view_header__big_button--dm')) {
        return { name, type: 'dm' };
    }
    if (headerButton.classList.contains('p-view_header__big_button--mpdm')) {
        return { name, type: 'mpdm' };
    }

    // Scope the icon to the header button. A Slack page contains many channel
    // icons, and the first one in the document usually belongs elsewhere.
    const icon = headerButton.querySelector('[data-inline-channel-type-icon]');
    return {
        name,
        type: icon && icon.getAttribute('data-inline-channel-type-icon') === 'lock-filled' ? 'private' : 'public'
    };
}

// Compose a formatted link for the current page
// Each formatted link has three parts: preText, urlText, and postText.
// preText: Text to appear before the link. Optional. 
// urlText: Text to appear in the link. Required.
// postText: Text to appear after the link. Optional.
// If the current page is not from a supported site, return blank strings for all three parts.
function getCurrentPageFormattedLink() {
    let preText = "";
    let urlText = "";
    let postText = "";
    let siteName = "";
    let url = window.location.href.split('#')[0];

    // Google Docs
    // URL starts with https://docs.google.com/document, https://docs.google.com/spreadsheets, or https://docs.google.com/presentation
    // urlText is the .docs-title-input element value. There is no preText or postText.
    if (/https:\/\/docs\.google\.com\/(document|spreadsheets|presentation)/.test(url)) {
        let titleElement = document.querySelector('.docs-title-input');
        urlText = titleElement ? titleElement.value : '';
        siteName = 'Google Docs';

    // Jira Tickets
    // URL starts with https://*.atlassian.net/browse
    // urlText is the issue key (ticket number). postText is the issue summary (title). There is no preText.
    } else if (/https:\/\/.*\.atlassian\.net\/browse/.test(url)) {
        let key = url.split('/').pop();
        let summaryElement = document.querySelector('h1[data-testid="issue.views.issue-base.foundation.summary.heading"]');
        let summary = summaryElement ? summaryElement.innerText : '';
        urlText = key;
        postText = ': "' + summary + '"';
        siteName = 'Jira Ticket';

    // Bugzilla Bugs
    // URL starts with https://bugzilla.mozilla.org/show_bug.cgi
    // urlText is the bug ID. postText is the bug summary (title). There is no preText.
    } else if (/https:\/\/bugzilla\.mozilla\.org\/show_bug\.cgi/.test(url)) {
        // Extract bug ID from URL - handle both ?id=123 and &id=123 formats
        let idMatch = url.match(/[?&]id=(\d+)/);
        let id = idMatch ? idMatch[1] : '';
        let summaryElement = document.querySelector('#field-value-short_desc');
        let summary = summaryElement ? summaryElement.innerText : '';
        urlText = id;
        postText = ': "' + summary + '"';
        siteName = 'Bugzilla';

    // Wikipedia Articles
    // URL starts with https://en.wikipedia.org/wiki
    // urlText is the article title. There is no preText or postText.
    } else if (/https:\/\/en\.wikipedia\.org\/wiki/.test(url)) {
        urlText = url.split("https://en.wikipedia.org/wiki/")[1];
        urlText = decodeURIComponent(urlText);
        urlText = urlText.split('#')[0];
        urlText = urlText.replace(/_/g, ' ');
        siteName = 'Wikipedia';

    // Experimenter (Nimbus) Experiments
    // URL starts with https://experimenter.services.mozilla.com/nimbus/
    // urlText is the experiment slug extracted from the URL. There is no preText or postText.
    } else if (/https:\/\/experimenter\.services\.mozilla\.com\/nimbus\/[^/]+/.test(url)) {
        let slug = url.match(/\/nimbus\/([^/?]+)/)[1];
        urlText = slug;
        siteName = 'Experimenter';

    // GitHub Issues and Pull Requests
    // URL matches https://github.com/{owner}/{repo}/issues/{number} or .../pull/{number}
    // preText is [owner/repo]. urlText is the issue/PR number. postText is the title.
    } else if (/https:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+/.test(url)) {
        let match = url.match(/https:\/\/github\.com\/([^/]+\/[^/]+)\/(issues|pull)\/(\d+)/);
        let repo = match[1];
        let type = match[2] === 'pull' ? 'PR' : 'Issue';
        let number = match[3];
        let titleElement = document.querySelector('.js-issue-title');
        let title = titleElement ? titleElement.innerText.trim() : '';
        if (!title) {
            let docTitle = document.title;
            let issueMatch = docTitle.match(/^(.*?)\s+·\s+(?:Issue|Pull Request)\s+#/);
            title = issueMatch ? issueMatch[1].replace(/\s+by\s+\S+$/, '') : '';
        }
        preText = '[' + repo + '] ';
        urlText = type + ' #' + number;
        postText = ': "' + title + '"';
        siteName = 'GitHub';
    }

    return { preText, urlText, postText, siteName };
}

// Send link information to the background script when requested 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'getFormattedLink') {
        const formattedLink = getCurrentPageFormattedLink();
        sendResponse(formattedLink);
    }

    if (request.action === 'getSelection') {
        selection = getCurrentPageSelection();
        sendResponse(selection);
    }

    if (request.action === 'getSlackContext') {
        sendResponse(getSlackContext());
    }

    if (request.action === 'getOpenGraphTitle') {
        let ogTitle = document.querySelector('meta[property="og:title"]');
        let urlText = ogTitle ? ogTitle.getAttribute('content') : '';
        sendResponse(urlText);
    }

});

// Listen for selection changes
document.addEventListener('selectionchange', () => {
    selection = getCurrentPageSelection();
    chrome.runtime.sendMessage({ action: 'selectionChanged', selection: selection });
});

// Get the current selection
function getCurrentPageSelection() {
    selection = window.getSelection().toString();
    if (selection.length > 64) {
        selection = selection.slice(0, 61) + '...';
    }
    return selection;
}