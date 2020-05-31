const IFRAME_CSP = `default-src 'self' 'unsafe-inline';`
const IFRAME_SANDBOX = `allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox`

const PATH = '/json-library/'
var profile = undefined
try { profile = JSON.parse(localStorage.profile) }
catch (e) { console.debug(e) }

// Library dot JSON Book Model:

function LibraryJsonBook(aBook) {
  this.title = aBook.title
  this.id = aBook.id
  this.author = aBook.author
  this.link = aBook.link || null
  this.image = aBook.image || null
  this.date_finished = aBook.date_finished || null
  var notes = aBook.notes || null;
  if (aBook.notes && !Array.isArray(aBook.notes)) {
    notes = [aBook.notes]
  }
  this.notes = notes ? notes.map((note) => {
    return note;
  }) : []
  this.binding = aBook.binding || null
  this.date_started = aBook.date_started ? Date.parse(aBook.date_started) : null
  this.date_finished = aBook.date_finished ? Date.parse(aBook.date_finished) : null
  this.last_updated = aBook.last_updated ? Date.parse(aBook.last_updated) : Date.now()
  this.reviews = aBook.reviews ? aBook.reviews.map((review) => {
    return {
      title: review.title,
      date: Date.parse(review.date),
      type: review.type === 'long' ? 'long' : 'short',
      content: review.content,
      read_status: review.read_status === 'done' ? 'done' : 'reading'
    }
  }) : []
  this.links = aBook.links ? aBook.links.map((link) => {
    return {
      url: link.url,
      last_accessed: link.last_accessed ? Date.parse(link.last_accessed) : null,
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
}

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
    if (values['did-read']){
      values.tags.push('read')
    }
    var filename = values.filename ? values.filename.trim() : ''+Date.now();
    values.id = filename;
    values.date_finished = values['did-read'] ? new Date().toDateString() : null;
    values.last_updated = new Date().toDateString();
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
          date: new Date().toDateString(),
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
      await beaker.hyperdrive.drive(profile.url).mkdir(PATH).catch(e => undefined)
      await beaker.hyperdrive.drive(profile.url).writeFile(PATH + filename, JSON.stringify(book, null, 4))
      location.reload()
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
      c: 0,
      shelves: {},
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
        try {
          var sources = []
          if (profile) {
            sources = await beaker.contacts.list()
          }
          let drive = sources.map(s => s.url)
          if (profile && !drive.includes(profile.url)) {
            drive.push(profile.url)
          }
          var files = await beaker.hyperdrive.query({
            path: PATH + '*.json',
            drive,
            sort: 'ctime',
            reverse: true,
            offset: window.lazyloadTools.page,
            limit: window.lazyloadTools.pageLimit
          })
          console.log({
            path: PATH + '*.json',
            drive,
            sort: 'ctime',
            reverse: true,
            offset: window.lazyloadTools.page,
            limit: window.lazyloadTools.pageLimit
          }, files)
        } catch (e) {
          // htmlObj.textContent = e.toString()
          console.debug(`Unable to query ${PATH}`, e)
          return
        }
        if (files.length === 0){
          return;
        }
        for (let file of files) {
          let postDiv = h('div', {class: 'post'})
          
          postDiv.append(
            h('a', {class: 'thumb', href: file.drive},
              h('img', {src: `${file.drive}thumb.png`})
            )
          )

          let filename = file.path.split('/').pop()
          let day = niceDate(file.stat.ctime)
          postDiv.append(h('div', {class: 'meta'}, 
            h('a', {href: file.url, title: filename}, filename),
            ' ',
            day
          ))

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
              let bookText = await beaker.hyperdrive.readFile(file.url)
              if (/\.json$/i.test(file.path)) {
                
                var bookJson = JSON.parse(bookText)
                if (!bookJson.hasOwnProperty('tags')){
                  continue;
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
                // console.log((this.c >= Math.floor(window.lazyloadTools.pageLimit / 2)), (this.c <= Math.ceil(window.lazyloadTools.pageLimit / 2)), (this.c === (window.lazyloadTools.pageLimit / 2)), this.c, window.lazyloadTools.pageLimit/2);
                // if ((this.c >= Math.floor(window.lazyloadTools.pageLimit / 2) && this.c <= Math.ceil(window.lazyloadTools.pageLimit / 2) ) || this.c === (window.lazyloadTools.pageLimit / 2)){
                //  console.log('Attach intersection observer to ', content )
                //  window.lazyloadTools.intersectObserver.observe(content)
                //}
                content.append(book(bookJson, postDiv.isShelf))
                content.setAttribute('data-count', window.lazyloadTools.c++);
                postDiv.append(content)
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
