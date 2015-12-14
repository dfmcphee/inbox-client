'use strict';

const ipc = require('electron').ipcRenderer;
let accounts = {};

let addAccountButton = document.getElementById('add-account');
let removeAccountButton = document.getElementById('remove-account');
let accountViews = document.getElementById('account-views');
let accountList = document.getElementById('account-list');
let selected = false;

let selectAccount = function(accountId)  {
  let listItem = document.getElementById('list-item-' + accountId);
  listItem.classList.add('list-item--selected');
  selected = accountId;
}

let unselectPreviousAccount = function() {
  let selectedListItems = document.getElementsByClassName('list-item--selected');
  if (selectedListItems && selectedListItems[0]) {
    selectedListItems[0].classList.remove('list-item--selected');
  }
};

let hidePreviousAccount = function() {
  let visibleAccountViews = document.getElementsByClassName('account-view--is-visible');
  if (visibleAccountViews && visibleAccountViews[0]) {
    visibleAccountViews[0].classList.remove('account-view--is-visible');
  }
};

let hideEmpty = function() {
  let emptyView = document.getElementById('emptyView');
  if (emptyView) {
    emptyView.classList.remove('empty--is-visible');
  }
};

let showEmpty = function() {
  let emptyView = document.getElementById('emptyView');
  if (emptyView) {
    emptyView.classList.add('empty--is-visible');
  }
};

let showAccount = function(accountId) {
  hideEmpty();
  hidePreviousAccount();
  unselectPreviousAccount();
  selectAccount(accountId);

  let accountView = document.getElementById(accountId);
  accountView.classList.add('account-view--is-visible');
  ipc.send('trigger-resize', accountId);
};

let addAccountListItem = function(account, index) {
  let newAccountListItem = document.createElement('li');
  newAccountListItem.id = 'list-item-' + account.slug;
  newAccountListItem.className = 'list-item';
  newAccountListItem.innerHTML = `<button type="button"
                                    class="list-item__toggle account-${index}"
                                    data-account="${account.slug}"
                                    aria-label="View account">
                                  </button>`;

  accountList.appendChild(newAccountListItem);
}

let addAccountView = function(account) {
  let newAccountView = document.createElement('div');
  newAccountView.id = account.slug;
  newAccountView.className = 'account-view';

  let webview = document.createElement('webview');
  webview.setAttribute('src', 'https://inbox.google.com/');
  webview.setAttribute('minwidth', '400px');
  webview.setAttribute('minheight', '300px');
  webview.setAttribute('allowpopups', 'on');
  webview.setAttribute('autosize', 'on');
  webview.setAttribute('partition', account.partition);

  webview.addEventListener("dom-ready", function(){
    //webview.openDevTools();
  });

  webview.addEventListener('new-window', function(e) {
    require('electron').shell.openExternal(e.url);
  });

  webview.addEventListener('ipc-message', function(evt) {
    console.log(evt);
  });

  accounts[account.slug] = webview;

  newAccountView.appendChild(webview);
  accountViews.appendChild(newAccountView);
};

ipc.on('accounts-loaded', function(evt, accounts) {
  if (accounts && accounts.length) {
    for (let i = 0; i < accounts.length; i++) {
      addAccountListItem(accounts[i], i + 1);
      addAccountView(accounts[i]);
    }
    showAccount(accounts[0].slug);
  }
  if (!Object.keys(accounts).length) {
    showEmpty();
  }
});

ipc.on('account-removed', function(evt, slug) {
  let accountView = document.getElementById(slug);
  accountView.parentNode.removeChild(accountView);
  let listItem = document.getElementById('list-item-' + slug);
  listItem.parentNode.removeChild(listItem);
  delete accounts[slug];

  if (!Object.keys(accounts).length) {
    showEmpty();
  }
});

ipc.on('account-created', function(evt, account) {
  addAccountListItem(account);
  addAccountView(account);
  showAccount(account.slug);
});

document.addEventListener("click", function(evt) {
  if (evt.target.classList.contains('list-item__toggle')) {
    let accountId = evt.target.dataset.account;
    showAccount(accountId);
  }
});

addAccountButton.addEventListener("click", function() {
  ipc.send('add-account', 'new');
});

removeAccountButton.addEventListener("click", function() {
  let result = confirm("Are you sure you want to remove this account?");
  if (result) {
    ipc.send('remove-account', selected);
  }
});

ipc.send('connect');
