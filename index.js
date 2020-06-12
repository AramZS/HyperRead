const IFRAME_CSP = `default-src 'self' 'unsafe-inline';`
const IFRAME_SANDBOX = `allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox`

const PATH = '/json-library/'
const LOCALPATH = '/local-json-library/'
var profile = undefined
try { profile = JSON.parse(localStorage.profile) }
catch (e) { console.debug(e) }

// Library dot JSON Book Model:

function LibraryJsonBook(aBook) {
  this.title = aBook.title
  this.id = aBook.id
  this.author = aBook.author
  this.link = aBook.link || null
  this.image = aBook.image || null;
  var notes = aBook.notes || null;
  if (aBook.notes && !Array.isArray(aBook.notes)) {
    notes = [aBook.notes]
  }
  this.notes = notes ? notes.map((note) => {
    return note;
  }) : []
  this.binding = aBook.binding || null
  this.date_started = aBook.date_started ? Date.parse(new Date(aBook.date_started)) : null
  this.date_finished = aBook.date_finished ? Date.parse(new Date(aBook.date_finished)) : null
  this.last_updated = aBook.last_updated ? Date.parse(new Date(aBook.last_updated)) : Date.now()
  this.reviews = aBook.reviews ? aBook.reviews.map((review) => {
    return {
      title: review.title,
      date: Date.parse(new Date(review.date)),
      type: review.type === 'long' ? 'long' : 'short',
      content: review.content,
      read_status: review.read_status === 'done' ? 'done' : 'reading'
    }
  }) : []
  this.links = aBook.links ? aBook.links.map((link) => {
    return {
      url: link.url,
      last_accessed: link.last_accessed ? Date.parse(new Date(link.last_accessed)) : null,
      type: link.type ? link.type : 'external'
    }
  }) : []
  this.image_source = aBook.image_source || null
  this.publisher = aBook.publisher || null
  this.additional_authors = aBook.additional_authors || null
  this.series = aBook.series || null
  this.tags = aBook.tags ? aBook.tags.map((tag) => {
    return tag
  }) : []
  this.bookIds = aBook.Ids ? aBook.Ids.map((idObj) => {
    return {
      type: ['ISBN', 'ISBN13', 'OLID', 'OCLC', 'LCCN', 'URL', 'BCID', 'GOODREADS', 'HYPER'].includes(idObj.type) ? idObj.type : null,
      id: idObj.id,
      note: idObj.note ? idObj.note : null // To add information about URLs used as IDs.
    }
  }) : []
  if (aBook.bookIds){
    this.bookIds = aBook.bookIds;
  }
}

LibraryJsonBook.prototype.fill = function(newBook, reverse){
  var newLbryBook = new LibraryJsonBook(newBook)
  newLbryBook.notes = newLbryBook.notes.concat(this.notes);
  if (newLbryBook.bookIds.length <= 0){
    newLbryBook.bookIds = this.bookIds;
  } else {
    this.bookIds.forEach((anId) => {
      var check = newLbryBook.bookIds.findIndex((elm) => {
        if (anId.type && elm.type && elm.type.trim() === anId.type.trim()) {
          return true;
        } else {
          return false;
        }
      });
      if (check >= 0) {

      } else {
        newLbryBook.bookIds.push(anId)
      }
    })
  }
  if (newLbryBook.links.length <= 0){
    newLbryBook.links = this.links;
  } else {
    this.links.forEach((aLink) => {
      var check = newLbryBook.links.findIndex((elm) => {
        if (aLink.url && elm.url && elm.url.trim() === aLink.url.trim()) {
          return true;
        } else {
          return false;
        }
      });
      if (check >= 0) {

      } else {
        newLbryBook.links.push(aLink)
      }
    })
  }

  if (this.image && this.image_source){
    if (!newLbryBook.image || (newLbryBook.image == this.image)){
      newLbryBook.image_source = this.image_source;
      newLbryBook.image = this.image;
    }
  }

  if (reverse){
    return Object.assign(newLbryBook, this);
  } else {
    return Object.assign(this, newLbryBook);
  }
}

window.LibraryJsonBook = LibraryJsonBook;

function inputsToLibraryJsonBook(){
      var values = {}; 
    let getInputs = function(nodes, values){
      nodes.forEach((e) => { 
        var aValue = e.value ? e.value : undefined; 
        if (e.type === 'checkbox') {
          aValue = e.checked;
        }
        if (aValue){
          values[e.name] = aValue;
        }
        if (e.value === undefined && e.childNodes.length){
          getInputs(e.childNodes, values)
        }
      });
    }
    getInputs(entrybox.childNodes, values)
    console.log(values);
    if (values.hasOwnProperty('tags')){
      var tags = values.tags.split(',')
      values.tags = tags.map(tag => tag.trim())
    } else {
      values.tags = [];
    }
    if (values['did-read'] && !values.tags.includes('read')){
      values.tags.push('read')
    }
    var filename = values.filename ? values.filename.trim() : ''+Date.now();
    values.id = filename;
    values.date_finished = values['did-read'] ? Date.now() : null;
    values.last_updated = Date.now();
    values.Ids = [
        {
          type: 'HYPER',
          id: Date.now().toString(),
          note: 'Generated on creation'
        } 
    ];
    if (values.link){
      values.links = [{ url: values.link }]
    }
    if (values.hasOwnProperty('review') || values.hasOwnProperty('review-title')){
      values.reviews = [
        {
          title: values.hasOwnProperty('review-title') && values['review-title'] ? values['review-title'] : 'ReadHyper Review',
          date: Date.now(),
          type: values.hasOwnProperty('review') && (values.review.length <= 250) ? 'short' : 'long',
          content: values.hasOwnProperty('review') ? values.review : '',
          read_status: values['did-read'] ? 'done' : 'not finished' 
        }
      ]
    }
    var book = new LibraryJsonBook(values)
    return { book, filename, values }
}

customElements.define('microlibrary-loader', class extends HTMLElement {
  async connectedCallback () {
    if (!profile) {
      this.append(h('button', {click: this.onClickChangeProfile.bind(this)}, 'Select a profile to load your library with'))
    } else {
      this.append(h('form', {submit: this.onSubmit},
        h('p', 'Your library has been loaded based on ', h('a', {href: 'https://tomcritchlow.com/2020/04/15/library-json/', 'target': '_blank'}, 'library.json'), '. Treating the book objects as flat files in a hyper drive and looking at an additional  `tag` property for sorting into shelves. ', h('a', {href: 'hyper://4b03eb8d11b4786628708ba8d4a4c8daae34a10683b085e46bdf14cffc9ff52d/'}, 'Add me as a contact to get started.')),
        h('p',
          ' ',
          h('small', h('a', {href: '#', click: this.onClickChangeProfile.bind(this)}, 'Change profile')), 
          h('span', { id: 'activate-entry' }, ' ', h('button', {click: this.activateEntry.bind(this)}, 'Enter a new book'))
        ),
        h('div', {id: 'entrybox', style: 'display:none'},
          h('input', {name: 'title', required: true, placeholder: 'Book Title'}),
          h('input', {name: 'author', required: true, placeholder: 'Book Author'}),
          h('br'),h('br'),
          h('p', 
            h('input', {name: 'review-title', placeholder: 'Enter review title (optional)'}),
            h('textarea', {name: 'review', placeholder: 'Enter your book review here (optional)'})
          ),
          h('input', {name: 'image', placeholder: 'Cover image url (optional)'}),
          h('input', {name: 'tags', placeholder: 'Comma Seperated Tags (optional)'}),
          h('label', {class: 'read-check-label'}, 'Did you finish reading the book?'),
          h('input', {name: 'did-read', id: 'did-read', type: 'checkbox'}),
          h('br'),
          h('input', {name: 'publisher', placeholder: 'Publisher (optional)'}),
          h('input', {name: 'link', placeholder: 'Link (optional)'}),
          h('br'),
            h('input', {name: 'filename', placeholder: 'Book id (optional)'}),
            h('button', {type: 'submit'}, `Post to ${profile.title}'s microlibrary`),
        )
      ))
    }
  }

  async onSubmit (e) {
    e.preventDefault()
    console.log(entrybox.childNodes)
    let { book, filename } = inputsToLibraryJsonBook()
    var builtFilename = filename || `${Date.now()}.json`
    console.log('Built filename ', builtFilename);
    if (builtFilename.indexOf('.') === -1) builtFilename += '.json'
    console.log(book, builtFilename);
    try {
      var bookPathUrl = window.lazyloadTools.profileToSource[profile.url]
      var pathAccountingForMount = PATH;
      if (bookPathUrl && bookPathUrl !== profile.url){
        // Mount URLs are intrinsically their own path so remove the path when writing to them.
        pathAccountingForMount = '';
      } else {
        await beaker.hyperdrive.drive(bookPathUrl).mkdir(PATH).catch(e => undefined)
      }
      var fileUri = bookPathUrl + pathAccountingForMount + builtFilename;
      try { 
        let bookText = await beaker.hyperdrive.drive(bookPathUrl).readFile(pathAccountingForMount + builtFilename);
        var oldBookJson = JSON.parse(bookText)
        var oldBookObj = new LibraryJsonBook(oldBookJson)
        book = oldBookObj.fill(book, false);
        console.log('Book updated', book)
      } catch (e) {
        console.log('New Book being created.', e)
      }
      try {
        await beaker.hyperdrive.drive(bookPathUrl).writeFile(pathAccountingForMount + builtFilename, JSON.stringify(book, null, 4))
      } catch (e) {
        await beaker.hyperdrive.drive(profile.url).writeFile(PATH + builtFilename, JSON.stringify(book, null, 4))
        pathAccountingForMount = PATH;
        bookPathUrl = profile.url;
      }
      var shelf = 'to-read';
      if (book.tags.includes('currently-reading')){
        shelf = 'currently-reading';
      } else if (book.tags.includes('read')){
        shelf = 'read'
      }
      var file = await beaker.hyperdrive.query({
                    path: pathAccountingForMount + builtFilename,
                    drive: [ bookPathUrl ],
                    sort: 'ctime',
                    reverse: true,
                    offset: 0,
                    limit:1
                  })
      file[0].profileDrive = profile.url;
      var postDiv = window.lazyloadTools.postDiv(file[0], book);
      if (postDiv === false){
        console.log('Post div build failed ', postDiv);
        location.reload()
      } else {
        var existingPost = document.querySelector('*[data-hyper-uri="'+fileUri+'"]')
        if (existingPost){
          existingPost.remove();
        }
        var shelfDiv = document.getElementById('shelf-is-'+postDiv.isShelf);
        shelfDiv.prepend(postDiv)
        var activate = document.querySelector('#activate-entry button'); activate.click();
        document.forms[0].reset();
        localStorage.removeItem('bookReviewDraft')
      }
      /**
      var bookHtml = window.bookBuilder(book, shelf);
      var shelfDiv = document.getElementById('shelf-is-'+postDiv.isShelf);
      if (!shelf.lastChild && bookHtml){
        console.log('First post ', bookHtml)
        shelfDiv.prepend(bookHtml)
      } else if (bookHtml) {
        shelfDiv.lastChild.after(bookHtml)
      }
       */
    } catch (e) {
      console.log(e)
    }
  }

  async onClickChangeProfile (e) {
    e.preventDefault()
    profile = await beaker.contacts.requestProfile()
    localStorage.profile = JSON.stringify(profile)
    location.reload()
  }

  async activateEntry (e) {
    e.preventDefault()
    var entryForm = document.getElementById('entrybox');
    let displayToggle = entryForm.style.display === 'none' ? 'block' : 'none';
    entryForm.style.display = displayToggle;
    var entryToFill = function(name, value){
      let el = document.querySelector(`#entrybox *[name="${name}"]`);
      if (el && value){
        el.value = value;
      }
      return el;
    }
    if (localStorage.getItem('bookReviewDraft')){
      var { values } = JSON.parse(localStorage.getItem('bookReviewDraft'))
      if (values.hasOwnProperty('did-read')){
        entryToFill('did-read').checked = values['did-read'];
        delete values['did-read'];
      }
      Object.keys(values).forEach((key)=>{
        entryToFill(key, values[key])
      })
    }
    entryForm.addEventListener("mouseout", function(){
      let { book, filename, values } = inputsToLibraryJsonBook()
      localStorage.setItem('bookReviewDraft', JSON.stringify({ book, filename, values }))
    })
  }
})

customElements.define('microlibrary-shelf-select', class extends HTMLElement {
  async connectedCallback () {
    this.addEventListener('click', e => {
      this.onClickChangeShelf(e)
    });
  
  }

  async onClickChangeShelf (e) {
    document.getElementById('shelf-is-read').style.display = 'none';
    document.getElementById('shelf-is-to-read').style.display = 'none';
    document.getElementById('shelf-is-currently-reading').style.display = 'none';
    document.getElementById('shelf-is-'+e.target.getAttribute('data-shelf')).style.display = 'block';
    e.preventDefault()
  }
})

window.lazyloadTools = { 
      intersectCount: 0,
      profileToSource: {},
      c: 0,
      shelves: {},
      postDiv: function(file, bookJson){
          let postDiv = h('div', {class: 'post'})
          postDiv.append(
            h('a', {class: 'thumb', href: file.profileDrive},
              h('img', {src: `${file.profileDrive}thumb.png`})
            )
          )

          let filename = file.path.split('/').pop()
          let day = niceDate(file.stat.ctime)
          postDiv.append(h('div', {class: 'meta'}, 
            h('a', {href: file.url, title: filename}, filename),
            ' ',
            day
          ))
          if (file.profileDrive == profile.url){
            postDiv.append((h('edit-jsonbook', {class: 'book-edit-button'}, 'Edit')));
          } else {
            postDiv.append((h('edit-jsonbook', {class: 'book-edit-button'}, 'Clone')));
          }
          postDiv.setAttribute('data-hyper-uri', file.url);
          postDiv.setAttribute('data-profile-uri', profile.url);
          try {
            if (/\.html?$/i.test(file.path)) {
                let content = h('iframe', {
                  class: 'content',
                  csp: IFRAME_CSP,
                  sandbox: IFRAME_SANDBOX,
                  src: file.url
                })
                postDiv.append(content)
            } else {
              
              if (/\.json$/i.test(file.path)) {

                if (!bookJson.hasOwnProperty('tags')){
                  return false;
                }
                var classes = 'content '
                if (bookJson.tags.includes('read')){
                  postDiv.classList.add('read')
                  postDiv.isShelf = 'read';
                  window.lazyloadTools.shelves['read'] = true
                } else if (bookJson.tags.includes('currently-reading')){
                  postDiv.classList.add('currently-reading')
                  postDiv.isShelf = 'currently-reading';
                  window.lazyloadTools.shelves['currently-reading'] = true
                } else {
                  postDiv.classList.add('to-read')
                  postDiv.isShelf = 'to-read';
                  window.lazyloadTools.shelves['to-read'] = true
                }
                let content = h('div', {class: classes})
                content.append(book(bookJson, postDiv.isShelf))
                content.setAttribute('data-count', window.lazyloadTools.c++);
                postDiv.append(content);
                return postDiv;
              }
            }
          } catch (e) {
            console.error('Failed to read', file.url)
            console.error(e)
            return false;
          }
      },
      intersectObserver:  new IntersectionObserver(async ()=>{ 
        console.log('Intersected.'); 
        if (window.lazyloadTools.intersectCount === 1){
          window.lazyloadTools.intersectObserver.disconnect();
          console.log('Intersection Unloaded.')
          window.lazyloadTools.intersectCount = 0
          await window.lazyloadTools.fillPage(document.getElementById('mlf')) 
        } else {
          window.lazyloadTools.intersectCount = 1
        }
      }),
      page: 0,
      pageCount: 50,
      pageLimit: 50,
      filled: {
        'read': 0,
        'to-read': 0,
        'currently-reading': 0
      },
      shelfBoxes: {
        'read': document.getElementById('shelf-is-read'),
        'to-read': document.getElementById('shelf-is-to-read'),
        'currently-reading': document.getElementById('shelf-is-currently-reading')
      },
      fillPage: async function(htmlObj){
        // window.profileToSource = {};
        try {
          var sources = [];
          if (profile) {
            sources = await beaker.contacts.list()
          }
          let drive = sources.map(s => s.url)
          if (profile && !drive.includes(profile.url)) {
            drive.push(profile.url)
          }
          var files = [];
          var resolves = drive.map(async (driveUrl) => {
            var perDriveFiles = await beaker.hyperdrive.query({
              path: PATH + '*.json',
              drive: [driveUrl],
              sort: 'ctime',
              reverse: true,
              offset: window.lazyloadTools.page,
              limit: window.lazyloadTools.pageLimit
            })
            var locationMappedPerDriveFiles = perDriveFiles.map((file) => {file.profileDrive = driveUrl; return file;});
            if (locationMappedPerDriveFiles && locationMappedPerDriveFiles.length > 0 && !window.lazyloadTools.profileToSource.hasOwnProperty(locationMappedPerDriveFiles[0].profileDrive)){
              window.lazyloadTools.profileToSource[locationMappedPerDriveFiles[0].profileDrive] = locationMappedPerDriveFiles[0].drive;
            }
            /**
             * 
            console.log({
              path: PATH + '*.json',
              drive,
              sort: 'ctime',
              reverse: true,
              offset: window.lazyloadTools.page,
              limit: window.lazyloadTools.pageLimit
            }, files)
            */
            files = files.concat(locationMappedPerDriveFiles)
            return locationMappedPerDriveFiles;
          });
          await Promise.all(resolves)
        } catch (e) {
          // htmlObj.textContent = e.toString()
          console.debug(`Unable to query ${PATH}`, e)
          return
        }
        if (files.length === 0){
          return;
        }
        for (let file of files) {
          var postDiv;
          try {
            if (/\.html?$/i.test(file.path)) {
                postDiv = window.lazyloadTools.postDiv(file, false);
            } else if (/\.json$/i.test(file.path)) {
                let bookText = await beaker.hyperdrive.readFile(file.url)
                var bookJson = JSON.parse(bookText)
                postDiv = window.lazyloadTools.postDiv(file, bookJson);
                if (postDiv === false){
                  continue;
                }
            }
          } catch (e) {
            console.error('Failed to read', file.path)
            console.error(e)
            continue
          }
          
          // console.log(this)
          var shelf = document.getElementById('shelf-is-'+postDiv.isShelf);
          if (!shelf.lastChild && postDiv){
            console.log('First post ', postDiv)
            shelf.append(postDiv)
          } else if (postDiv) {
            shelf.lastChild.after(postDiv)
          }
        }
        
        window.lazyloadTools.page += window.lazyloadTools.pageCount + 1;
        window.lazyloadTools.pageLimit += window.lazyloadTools.pageCount + 1;
        let attachIntersectionObserver = true;
        for (let key of Object.keys(window.lazyloadTools.shelves) ){
          if (window.lazyloadTools.shelves.hasOwnProperty(key)){
            if (document.getElementById('shelf-is-'+key).childElementCount < 5){
              console.log(key, document.getElementById('shelf-is-'+key).childElementCount)
              await window.lazyloadTools.fillPage(document.getElementById('mlf')) 
              attachIntersectionObserver = false;
              break;
            }
          }
        }
        if (attachIntersectionObserver === true){
          for (let key of Object.keys(window.lazyloadTools.shelves) ){
              if (window.lazyloadTools.shelves.hasOwnProperty(key)){
                var elCount = document.getElementById('shelf-is-'+key).childElementCount;
                var targetElNum = Math.floor(elCount/2) 
                var targetEl = document.getElementsByClassName('post '+key)[targetElNum]
                console.log('Attach intersection observer to ', targetEl)
                window.lazyloadTools.intersectObserver.observe(targetEl)
              }
            }
          }
      }
  }

// LOL I need to get better at Custom Elements >.< 
customElements.define('microlibrary-feed', class extends HTMLElement {
  async connectedCallback () {
    this.id = 'mlf'
    this.shelf = 'read'
    this.shelves = window.lazyloadTools.shelves
    // this.textContent = 'loading...'
    this.c = 0;
    this.observers = [];
    if (this.childNodes.length === 1){
      // await window.lazyloadTools.fillPage(this);
    }
    return false;
  }
})

customElements.define('microlibrary-shelf', class extends HTMLElement {
  async connectedCallback () {
    this.isShelfFor = 'read'
    // this.textContent = 'loading...'
    this.c = 0;
    this.observers = [];
    if (this.childNodes.length === 1){
      // await window.lazyloadTools.fillPage(this);
    }
    return false;
  }
})

class ManipulateJSONBook extends HTMLElement {
  constructor() {
    // Always call super first in constructor
    super();
  }
  async connectedCallback () {
    this.addEventListener('click', this._onClick);
    this.className += " book-editor"
    return false;
  }
  async disconnectedCallback (){
    this.removeEventListener('click', this._onClick);
  }
  _onClick(){
    var el = this.parentElement;
    console.log(el)
  }
}
/**
 * 
 *         h('div', {id: 'entrybox', style: 'display:none'},
          h('input', {name: 'title', required: true, placeholder: 'Book Title'}),
          h('input', {name: 'author', required: true, placeholder: 'Book Author'}),
          h('br'),h('br'),
          h('p', 
            h('input', {name: 'review-title', placeholder: 'Enter review title (optional)'}),
            h('textarea', {name: 'review', placeholder: 'Enter your book review here (optional)'})
          ),
          h('input', {name: 'image', placeholder: 'Cover image url (optional)'}),
          h('input', {name: 'tags', placeholder: 'Comma Seperated Tags (optional)'}),
          h('label', {class: 'read-check-label'}, 'Did you finish reading the book?'),
          h('input', {name: 'did-read', id: 'did-read', type: 'checkbox'}),
          h('br'),
          h('input', {name: 'publisher', placeholder: 'Publisher (optional)'}),
          h('input', {name: 'link', placeholder: 'Link (optional)'}),
          h('br'),
            h('input', {name: 'filename', placeholder: 'Book id (optional)'}),
            h('button', {type: 'submit'}, `Post to ${profile.title}'s microlibrary`),
        )
 */

function applyDataToForm(e, bookJson){
      switch (e.name) {
          case 'title':
            e.value = bookJson.title;
            break;
          case 'filename':
            e.value = bookJson.id;
            break;
          case 'author':
            e.value = bookJson.author
            break;
          case 'review-title':
            e.value = bookJson.reviews.length ? bookJson.reviews[0].title : ''
            break;
          case 'review':
            e.value = bookJson.reviews.length ? bookJson.reviews[0].content : ''
            break;
          case 'image':
            e.value = bookJson.image ? bookJson.image : '';
            break;
          case 'tags':
          console.log('tags', bookJson)
            e.value = bookJson.tags ? bookJson.tags.join(', ') : ''
            break;
          case 'did-read':
            e.checked = bookJson.tags.includes('read') || bookJson.date_finished ? true : false;
            break;
          case 'publisher':
            e.value = bookJson.publisher.length > 0 ? bookJson.publisher : '';
            break;
          case 'link':
            e.value = bookJson.links.length ? bookJson.links[0].url : '';
            break;
          default:
            break;
        }
}

customElements.define('edit-jsonbook', class extends ManipulateJSONBook {
  _onClick = async (thisEl) => {
    console.log(thisEl.target)
    var el = thisEl.target.parentElement;
    let editBookText = await beaker.hyperdrive.readFile(el.getAttribute('data-hyper-uri'))
    var editBookJson = JSON.parse(editBookText)

    console.log('edit book - ', el, editBookJson)
    if (entrybox.style.display === "none"){
      var activate = document.querySelector('#activate-entry button'); activate.click();
    }
    document.forms[0].reset();
    entrybox.childNodes.forEach(
      (e) => {
        if (e.tagName === 'P'){
          e.childNodes.forEach((pe) => {
            applyDataToForm(pe, editBookJson)
          })
        } else {
          applyDataToForm(e, editBookJson)
        }
      }
    )
    document.forms[0].scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
})

customElements.define('remove-jsonbook', class extends ManipulateJSONBook {
  _onClick = async (thisEl) => {
    console.log(thisEl.target)
    var el = thisEl.target.parentElement;
    let editBookText = await beaker.hyperdrive.readFile(el.getAttribute('data-hyper-uri'))
    var editBookJson = JSON.parse(editBookText)
    var bookJson = new LibraryJsonBook(editBookJson);

    console.log('delete book - ', el, editBookJson)
    if (window.confirm(`Do you really want to delete your entry for ${bookJson.title}?`)){
      console.log('delete confirmed');
      el.remove();
    }
  }
})


window.lazyloadTools.fillPage(document.getElementById('mlf'));


function book (libJsonBook, shelf){
  let action = 'wants to read'
  switch (shelf){
    case 'read':
      action = 'finished reading';
      break;
    case 'currently-reading':
      action = 'is reading';
      break;
    default: 
      action = 'wants to read'
  }
  var imageBlock = '';
  if (libJsonBook.image && !libJsonBook.image.includes('nophoto')){
    imageBlock = h('img', {src:libJsonBook.image})
  }
  return (h('div', {class: 'json-lib-book', id: libJsonBook.id}, 
    h('em', action),
    h('h3', libJsonBook.title),
    h('div', { class: 'json-lib-book-content' }, 
      h('h4', {class: 'author'}, 'By ' + libJsonBook.author),
      h('div', {class: 'review'}, 
        imageBlock,
        h('h5',  libJsonBook.reviews[0] ? libJsonBook.reviews[0].title : ''),
        h('p', libJsonBook.reviews[0] ? libJsonBook.reviews[0].content  : '')
      ),
      h('div', {class: 'taged'}, h('p', 
        'Tagged: ', h('span', {class: 'tags'}, libJsonBook.tags.join(', '))
      ))
    )
  ))
}

window.bookBuilder = book;

function h (tag, attrs, ...children) {
  var el = document.createElement(tag)
  if (isPlainObject(attrs)) {
    for (let k in attrs) {
      if (typeof attrs[k] === 'function') el.addEventListener(k, attrs[k])
      else el.setAttribute(k, attrs[k])
    }
  } else if (attrs) {
    children = [attrs].concat(children)
  }
  for (let child of children) el.append(child)
  return el
}

function isPlainObject (v) {
  return v && typeof v === 'object' && Object.prototype === v.__proto__
}

var today = (new Date()).toLocaleDateString()
var yesterday = (new Date(Date.now() - 8.64e7)).toLocaleDateString()
function niceDate (ts) {
  var date = (new Date(ts)).toLocaleDateString()
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return date
}
