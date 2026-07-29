/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Author: David Rubino
 */

let textLinkText = {};
let titleLinkText = {};
let formattedLinkPreText = {};
let formattedLinkUrlText = {};
let formattedLinkPostText = {};
let siteName = {};
let selectionLinkText = {};

let pageActionVisible = {};
let pageLoading = {};
let activeTabId = null;

// Initialize active tab on startup
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
        activeTabId = tabs[0].id;
    }
});

// Persistent context menu item for right-clicking selected text on any page
chrome.contextMenus.create({
    id: 'copySelectionFlink',
    title: 'Copy Selection Flink',
    contexts: ['selection']
});

// Persistent context menu item for right-clicking Slack message timestamp links
chrome.contextMenus.create({
    id: 'copySlackFlink',
    title: 'Copy Slack Flink',
    contexts: ['link'],
    documentUrlPatterns: ['*://app.slack.com/client/*'],
    targetUrlPatterns: ['*://*.slack.com/archives/*/p*']
});

//Add or remove page action button and context menu when the tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    // If the tab is loading, hide the page action button and remove the context menu
    if (changeInfo.status === 'loading') {
        console.log('Tab is loading, hiding page action button and removing context menu: ', tabId);
        pageLoading[tabId] = true;
        chrome.pageAction.hide(tabId);
        pageActionVisible[tabId] = false;
        // Only remove context menu if this is the active tab
        if (tabId === activeTabId) {
            removePageActionMenuItems();
        }
    }

    // If the tab has finished loading, show the page action button and set up the context menu
    // If the tab title has changed, refresh the context menu only if it's the active tab
    if (changeInfo.status === 'complete') {
        console.log('Tab loading is complete, setting up button and menu for tab: ', tabId);
        pageLoading[tabId] = false;
        // Only update context menu if this is the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id === tabId) {
                activeTabId = tabId;
                removePageActionMenuItems();
                loadPageAction(tab);
                getSelection(tabId);
            }
        });
        console.log('Showing page action button for tab:', tabId);
        chrome.pageAction.show(tabId);
        pageActionVisible[tabId] = true;
    } else if (changeInfo.title && pageActionVisible[tabId] && tabId === activeTabId) {
        // Tab title changed - only update context menu if this is the active tab
        console.log('Tab title changed for active tab, refreshing context menu: ', tabId);
        removePageActionMenuItems();
        loadPageAction(tab);
        getSelection(tabId);
    }
});

// Refresh the page action button and context menu when the tab is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('Tab activated: ', activeInfo.tabId);
    activeTabId = activeInfo.tabId;
    refreshPageAction(activeInfo.tabId);
});

// Refresh the page action button and context menu when a window gets focus
chrome.windows.onFocusChanged.addListener((windowId) => {
    console.log('Window focus changed: ', windowId);
    if (windowId > 0) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                activeTabId = tabs[0].id;
                refreshPageAction(tabs[0].id);
            }
        });
    }
});

function refreshPageAction(tabId) {
    // Only refresh the page action button if the tab is not loading
    if (!pageLoading[tabId]) {

        // Get the current tab
        chrome.tabs.get(tabId, (tab) => {

            console.log('Tab is not loading, resetting everything for tab: ', tabId);
            chrome.pageAction.hide(tabId);
            pageActionVisible[tabId] = false;
            removePageActionMenuItems();
            loadPageAction(tab);
            getSelection(tabId);
            console.log('Showing page action button for tab:', tabId);
            chrome.pageAction.show(tabId);
            pageActionVisible[tabId] = true;

        });

    } else {
        console.log('Tab is loading, not refreshing page action button for tab: ', tabId);
    }
}

// Populate the page action button and context menu 
function loadPageAction(tab) {
    // Prepare URL text
    if (tab.url.length > 64) {
        textLinkText[tab.id] = tab.url.slice(0, 61) + '...';
    } else {
        textLinkText[tab.id] = tab.url;
    }
    console.log('textLinkText: ', textLinkText[tab.id]);

    // Initialize titleLinkText to null to indicate we're loading
    titleLinkText[tab.id] = null;
    formattedLinkPreText[tab.id] = null;
    formattedLinkUrlText[tab.id] = null;
    formattedLinkPostText[tab.id] = null;
    siteName[tab.id] = null;

    // Get title link text
    getOpenGraphTitle(tab.id).then((urlText) => {
        console.log('openGraphTitle: ', urlText);
        titleLinkText[tab.id] = urlText;

        if (titleLinkText[tab.id] && titleLinkText[tab.id].length > 64) {
            titleLinkText[tab.id] = titleLinkText[tab.id].slice(0, 61) + '...';
        }

        if (!titleLinkText[tab.id]) {
            if (tab.title.length > 64) {
                titleLinkText[tab.id] = tab.title.slice(0, 61) + '...';
            } else {
                titleLinkText[tab.id] = tab.title;
            }
            console.log("Used tab title: ", titleLinkText[tab.id]);
        } else {
            console.log("Used Open Graph title: ", titleLinkText[tab.id]);
        }

        // Update context menu items
        updateContextMenuItems(tab);
    });

    // Get formatted link text
    getFormattedLinkText(tab.id).then((formattedLink) => {
        if (formattedLink && formattedLink.urlText) {
            console.log('formattedLinkText: ', formattedLink.preText, formattedLink.urlText, formattedLink.postText);
            formattedLinkPreText[tab.id] = formattedLink.preText;
            formattedLinkUrlText[tab.id] = formattedLink.urlText;
            formattedLinkPostText[tab.id] = formattedLink.postText;
            siteName[tab.id] = formattedLink.siteName;
        } else {
            console.log('No formatted link text for this page');
            formattedLinkPreText[tab.id] = '';
            formattedLinkUrlText[tab.id] = '';
            formattedLinkPostText[tab.id] = '';
            siteName[tab.id] = '';
        }

        // Update context menu items
        updateContextMenuItems(tab);
    });
}

// Update context menu items (called after async data loads)
function updateContextMenuItems(tab) {
    // Only update if this is still the active tab (prevents background tabs from overwriting the menu)
    if (tab.id !== activeTabId) {
        console.log('Skipping context menu update - tab is not active:', tab.id, 'activeTabId:', activeTabId);
        return;
    }
    
    // Only update if title data is loaded (it's required for menu creation)
    if (titleLinkText[tab.id] !== null && titleLinkText[tab.id] !== undefined) {
        // Also check if formatted link data is loaded (even if empty)
        if (formattedLinkPreText[tab.id] !== null && formattedLinkPreText[tab.id] !== undefined) {
            createContextMenuItems(tab);
        }
    }
}

const pageActionMenuIds = ['copyLink', 'copyTitle', 'copySelectionLink', 'copyFormattedLink'];

function removePageActionMenuItems() {
    pageActionMenuIds.forEach(id => {
        chrome.contextMenus.remove(id, () => {
            void chrome.runtime.lastError;
        });
    });
}

// Create context menu items using shared configuration
function createContextMenuItems(tab) {
    // Remove existing page action items (preserving the persistent selection flink item)
    removePageActionMenuItems();
    
    const options = getLinkOptions(tab);
    
    options.forEach(option => {
        if (option.isAvailable()) {
            const displayText = option.getDisplayText ? option.getDisplayText() : '';
            chrome.contextMenus.create({
                id: option.id,
                title: option.label + displayText,
                contexts: ['page_action']
            });
        }
    });
}

// Get the Open Graph title for the current tab
function getOpenGraphTitle(tabId) {
    console.log('Getting Open Graph title for tab: ', tabId);

    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'getOpenGraphTitle' }, (urlText) => {
            console.log('Got Open Graph title response: ', urlText);
            resolve(urlText);
        });
    });
}

// Get the formatted link text for the current tab
function getFormattedLinkText(tabId) {
    console.log('Getting formatted link text for tab: ', tabId);

    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'getFormattedLink' }, (formattedLink) => {
            console.log('Got formatted link response: ', formattedLink);
            resolve(formattedLink)
        });
    });
}

// Listen for messages from the content script that the selection has changed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'selectionChanged') {
        console.log('Selection changed: ', message.selection);
        selectionLinkText[sender.tab.id] = message.selection;
        // Only update context menu if this is the active tab
        if (sender.tab.id === activeTabId) {
            loadSelectionLink(sender.tab.id);
        }
    }
});

// Get the current selection from the given tab
function getSelection(tabId) {
    console.log('Getting selection link for tab: ', tabId);

    chrome.tabs.sendMessage(tabId, { action: 'getSelection' }, (selection) => {
        console.log('Got selection: ', selection);
        selectionLinkText[tabId] = selection;
        loadSelectionLink(tabId);
    });
}

// Load the selection link for the current tab
function loadSelectionLink(tabId) {
    // Get the tab and recreate all context menu items with updated selection
    chrome.tabs.get(tabId, (tab) => {
        if (tab) {
            createContextMenuItems(tab);
        }
    });
}

// Shared copy functions for all link types
async function copyUrl(tab) {
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/plain': new Blob([tab.url], { type: 'text/plain' }),
            'text/html': new Blob(["<a href='" + tab.url + "'>" + tab.url + "</a>"], { type: 'text/html' })
        })
    ]);
}

async function copyTitleLink(tab) {
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/plain': new Blob(['"' + titleLinkText[tab.id] + '" (' + tab.url + ')'], { type: 'text/plain' }),
            'text/html': new Blob(["<a href='" + tab.url + "'>" + titleLinkText[tab.id] + "</a>"], { type: 'text/html' })
        })
    ]);
}

async function copyFormattedLink(tab) {
    // Format text/plain based on site type
    let plainText = '';
    if (siteName[tab.id] === 'Google Docs' || siteName[tab.id] === 'Wikipedia') {
        // Google Docs: "Title" (URL)
        // Wikipedia: Just URL
        if (siteName[tab.id] === 'Google Docs') {
            plainText = '"' + formattedLinkUrlText[tab.id] + '" (' + tab.url + ')';
        } else {
            // Wikipedia: just the URL
            plainText = tab.url;
        }
    } else {
        // Bugzilla/Jira: URL: "Summary"
        plainText = tab.url + formattedLinkPostText[tab.id];
    }
    
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([formattedLinkPreText[tab.id] + "<a href='" + tab.url + "'>" + formattedLinkUrlText[tab.id] + "</a>" + formattedLinkPostText[tab.id]], { type: 'text/html' })
        })
    ]);
}

async function copySelectionLink(tab) {
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/plain': new Blob(['"' + selectionLinkText[tab.id] + '" (' + tab.url + ')'], { type: 'text/plain' }),
            'text/html': new Blob(["<a href='" + tab.url + "'>" + selectionLinkText[tab.id] + "</a>"], { type: 'text/html' })
        })
    ]);
}

async function copySlackFlink(linkUrl, tabId) {
    const context = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'getSlackContext' }, resolve);
    });

    if (!context || !context.dataTs) {
        console.log('No Slack context available, falling back to raw URL copy');
        await navigator.clipboard.writeText(linkUrl);
        return;
    }

    const isReply = /[?&]thread_ts=/.test(linkUrl);
    const messageType = isReply ? 'reply' : 'message';

    const date = new Date(parseFloat(context.dataTs) * 1000);
    const monthDay = date.toLocaleString('en-US', { month: 'short', day: 'numeric' });

    let channelDescriptor = '';
    switch (context.channelType) {
        case 'public':
            channelDescriptor = '#' + context.channelName;
            break;
        case 'private':
            channelDescriptor = '\u{1F512}' + context.channelName;
            break;
        case 'dm':
            channelDescriptor = 'DM with ' + context.channelName;
            break;
        case 'mpdm':
            channelDescriptor = 'group DM';
            break;
    }

    const sender = context.sender || 'unknown';
    const displayText = 'Slack ' + messageType + ' from ' + sender + ' on ' + monthDay + ' in ' + channelDescriptor;
    const plainText = displayText + ': ' + linkUrl;

    await navigator.clipboard.write([
        new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob(["<a href='" + linkUrl + "'>" + displayText + "</a>"], { type: 'text/html' })
        })
    ]);
}

// Get shared link options configuration for a tab
function getLinkOptions(tab) {
    const options = [];
    
    // Always include URL option
    options.push({
        id: 'copyLink',
        label: 'Copy URL: ',
        getDisplayText: () => textLinkText[tab.id] || tab.url,
        isAvailable: () => true,
        copy: () => copyUrl(tab)
    });
    
    // Title link option (only if title is loaded and not null/undefined)
    if (titleLinkText[tab.id] !== null && titleLinkText[tab.id] !== undefined) {
        options.push({
            id: 'copyTitle',
            label: 'Copy Title Link: ',
            getDisplayText: () => titleLinkText[tab.id],
            isAvailable: () => true,
            copy: () => copyTitleLink(tab)
        });
    }
    
    // Selection link option
    if (selectionLinkText[tab.id]) {
        options.push({
            id: 'copySelectionLink',
            label: 'Copy Selection Link: ',
            getDisplayText: () => selectionLinkText[tab.id],
            isAvailable: () => true,
            copy: () => copySelectionLink(tab)
        });
    }
    
    // Formatted link option (only if formatted link data exists)
    if (formattedLinkUrlText[tab.id] !== null && formattedLinkUrlText[tab.id] !== undefined && 
        formattedLinkUrlText[tab.id] !== '' && 
        siteName[tab.id] !== null && siteName[tab.id] !== undefined && siteName[tab.id] !== '') {
        options.push({
            id: 'copyFormattedLink',
            label: 'Copy ' + siteName[tab.id] + ' Flink: ',
            getDisplayText: () => formattedLinkPreText[tab.id] + '[' + formattedLinkUrlText[tab.id] + ']' + formattedLinkPostText[tab.id],
            getFormattedParts: () => ({
                preText: formattedLinkPreText[tab.id] || '',
                urlText: formattedLinkUrlText[tab.id] || '',
                postText: formattedLinkPostText[tab.id] || ''
            }),
            isAvailable: () => true,
            copy: () => copyFormattedLink(tab)
        });
    }
    
    return options;
}

// When the button is clicked, copy the URL to the clipboard
// Note: This will not fire when popup is defined, but kept for backwards compatibility
chrome.pageAction.onClicked.addListener(async (tab) => {
    console.log('Page action button clicked, copying URL to clipboard');
    await copyUrl(tab);
});

// Handle context menu options 
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'copySelectionFlink') {
        let selection = info.selectionText;
        if (selection && selection.length > 64) {
            selection = selection.slice(0, 61) + '...';
        }
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/plain': new Blob(['"' + selection + '" (' + tab.url + ')'], { type: 'text/plain' }),
                'text/html': new Blob(["<a href='" + tab.url + "'>" + selection + "</a>"], { type: 'text/html' })
            })
        ]);
        return;
    }

    if (info.menuItemId === 'copySlackFlink') {
        await copySlackFlink(info.linkUrl, tab.id);
        return;
    }

    const options = getLinkOptions(tab);
    const option = options.find(opt => opt.id === info.menuItemId);
    
    if (option) {
        console.log('Context menu item clicked:', info.menuItemId);
        await option.copy();
    }
});