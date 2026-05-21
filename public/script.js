// =========================================
// DPGNotes
// Production SPA Script
// =========================================

/* =========================================
   FIREBASE
========================================= */

import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {

  getAuth,

  GoogleAuthProvider,

  GithubAuthProvider,

  signInWithPopup,

  signOut,

  onAuthStateChanged

}
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {

  getFirestore,

  collection,

  addDoc,

  getDocs,

  query,

  orderBy,

  limit,

  serverTimestamp

}
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

/* =========================================
   CONFIG
========================================= */

const firebaseConfig = {

  apiKey:
  "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",

  authDomain:
  "dpgnotes.firebaseapp.com",

  projectId:
  "dpgnotes",

  storageBucket:
  "dpgnotes.firebasestorage.app",

  messagingSenderId:
  "910494426039",

  appId:
  "1:910494426039:web:adeae5315caaf846c43e32"
};

/* =========================================
   INIT
========================================= */

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);

const PDF_VIEWER =
"https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=";

/* =========================================
   PROVIDERS
========================================= */

const googleProvider =
  new GoogleAuthProvider();

const githubProvider =
  new GithubAuthProvider();

/* =========================================
   DOM
========================================= */

const pages =
  document.querySelectorAll(".spa-page");

const navButtons =
  document.querySelectorAll(
    ".bottom-nav button"
  );

const categoryButtons =
  document.querySelectorAll(
    ".category-strip button"
  );

const googleLogin =
  document.getElementById(
    "googleLogin"
  );

const githubLogin =
  document.getElementById(
    "githubLogin"
  );

const globalSearch =
  document.getElementById(
    "globalSearch"
  );

const uploadForm =
  document.getElementById(
    "uploadForm"
  );

const latestResources =
  document.getElementById(
    "latestResources"
  );

const examResources =
  document.getElementById(
    "examResources"
  );

const learningResources =
  document.getElementById(
    "learningResources"
  );

const placementResources =
  document.getElementById(
    "placementResources"
  );

/* =========================================
   STATE
========================================= */

let currentUser = null;

let allDocuments = [];

/* =========================================
   URL PARAM ENGINE
========================================= */

const urlParams =
new URLSearchParams(
  window.location.search
);

/* -----------------------------------------
   SAFE PARAM
----------------------------------------- */

function getParam(key){

  try{

    return urlParams.get(key);

  }catch(error){

    console.log(
      "Param Error:",
      error
    );

    return null;
  }
}

/* -----------------------------------------
   PARAMS
----------------------------------------- */

const urlTab =
getParam("tab");

const urlCategory =
getParam("category");

const urlSearch =
getParam("search");

const urlPdf =
getParam("pdf");

const urlRef =
getParam("ref");

const urlUploader =
getParam("uploader");

/* -----------------------------------------
   OPTIONAL DEBUG
----------------------------------------- */

try{

  if(urlRef){

    console.log(
      "Project Ref:",
      urlRef
    );
  }

  if(urlUploader){

    console.log(
      "Uploader:",
      urlUploader
    );
  }

}catch(error){

  console.log(
    "URL Debug Error:",
    error
  );
}

/* =========================================
   AUTH
========================================= */

/* =========================================
   AUTH SYSTEM
========================================= */

let authMode = "login";

/* GOOGLE */

googleLogin.addEventListener(
  "click",
  async () => {

    try {

      // LOGOUT

      if(currentUser){

        await signOut(auth);

        return;
      }

      // LOGIN

      await signInWithPopup(
        auth,
        googleProvider
      );

    } catch(error){

      console.log(error);
    }
  }
);

/* GITHUB */

githubLogin.addEventListener(
  "click",
  async () => {

    try {

      await signInWithPopup(
        auth,
        githubProvider
      );

    } catch(error){

      console.log(error);
    }
  }
);

/* AUTH STATE */

onAuthStateChanged(
  auth,
  (user)=>{

    if(user){

      currentUser = user;

      googleLogin.innerHTML =
      "Logout";

      githubLogin.style.display =
      "none";

    }else{

      currentUser = null;

      googleLogin.innerHTML =
      "Google";

      githubLogin.style.display =
      "flex";
    }
  }
);

/* =========================================
   SPA NAVIGATION
========================================= */

function openPage(pageId){

  pages.forEach((page)=>{

    page.classList.remove(
      "active"
    );
  });

  document
    .getElementById(pageId)
    .classList.add("active");

  window.scrollTo({

    top:0,

    behavior:"smooth"
  });

  navButtons.forEach((button)=>{

    button.classList.remove(
      "active-nav"
    );

    if(

      button.dataset.page
      ===
      pageId

    ){

      button.classList.add(
        "active-nav"
      );
    }
  });
}

/* =========================================
   NAV BUTTONS
========================================= */

navButtons.forEach((button)=>{

  button.addEventListener(
    "click",
    ()=>{

      openPage(
        button.dataset.page
      );
    }
  );
});

/* =========================================
   KEYBOARD SHORTCUTS
========================================= */

document.addEventListener(
  "keydown",
  (e)=>{

    // ALT + 1

    if(

      e.altKey &&
      e.key === "1"

    ){

      openPage(
        "resourcesPage"
      );
    }

    // ALT + 2

    if(

      e.altKey &&
      e.key === "2"

    ){

      openPage(
        "examsPage"
      );
    }

    // ALT + 3

    if(

      e.altKey &&
      e.key === "3"

    ){

      openPage(
        "learningPage"
      );
    }

    // ALT + 4

    if(

      e.altKey &&
      e.key === "4"

    ){

      openPage(
        "placementPage"
      );
    }

    // ALT + 5

    if(

      e.altKey &&
      e.key === "5"

    ){

      openPage(
        "contributionPage"
      );
    }

    // CTRL + K

    if(

      e.ctrlKey &&
      e.key.toLowerCase() === "k"

    ){

      e.preventDefault();

      globalSearch.focus();
    }
  }
);

/* =========================================
   RESOURCE CARD
========================================= */

function createCard(data){

  return `

  <article class="resource-card">

    <div class="card-top">

      <span class="category">
        ${data.category}
      </span>

      <span class="discipline">
        ${data.discipline}
      </span>

    </div>

    <h3>
      ${data.title}
    </h3>

    <p>
      ${data.description}
    </p>

    <div class="tags">

      ${data.tags.map(tag => `

        <span>
          #${tag.trim()}
        </span>

      `).join("")}

    </div>

    <a href="https://akshat-881236.github.io/AkshatNetworkHub/PdfViewer/index.htm?pdf=${encodeURIComponent(data.pdfUrl)}&title=${encodeURIComponent(data.title)}&category=${encodeURIComponent(data.category)}&discipline=${encodeURIComponent(data.discipline)}&uploader=${encodeURIComponent(data.userName)}&docid=${encodeURIComponent(data.documentId)}&description=${encodeURIComponent(data.description)}&tags=${encodeURIComponent(
    Array.isArray(data.tags)
    ? data.tags.join(", ")
    : ""
  )}"target="_blank" class="open-btn">Open PDF</a></article>

  `;
}

/* =========================================
   RENDER
========================================= */

function renderResources(data){

  latestResources.innerHTML = "";

  examResources.innerHTML = "";

  learningResources.innerHTML = "";

  placementResources.innerHTML = "";

  data.forEach((doc)=>{

    const card =
    createCard(doc);

    // HOME

    latestResources.innerHTML +=
    card;

    // EXAMS

    if(

      doc.category === "SE"

      ||

      doc.category === "SP"

      ||

      doc.category === "UE"

      ||

      doc.category === "EV"

    ){

      examResources.innerHTML +=
      card;
    }

    // LEARNING

    if(

      doc.category === "T&N"

    ){

      learningResources.innerHTML +=
      card;
    }

    // PLACEMENT

    if(

      doc.category === "IQ"

      ||

      doc.category === "A&LR"

      ||

      doc.category === "PQ"

    ){

      placementResources.innerHTML +=
      card;
    }
  });
}

/* =========================================
   FETCH FIRESTORE
========================================= */

async function fetchDocuments(){

  try{

    const q = query(

      collection(
        db,
        "documents"
      ),

      orderBy(
        "createdAt",
        "desc"
      ),

      limit(50)
    );

    const snapshot =
    await getDocs(q);

    allDocuments = [];

    snapshot.forEach((doc)=>{

      allDocuments.push({

        id:doc.id,

        ...doc.data()
      });
    });

    applyURLFilters();

  }catch(error){

    console.log(error);
  }
}

/* =========================================
   URL FILTERS
========================================= */

function applyURLFilters(){

  try{

    let filtered =
    [...allDocuments];

    /* CATEGORY */

    if(urlCategory){

      filtered =
      filtered.filter((doc)=>{

        return(

          doc.category
          ===
          urlCategory
        );
      });
    }

    /* SEARCH */

    if(urlSearch){

      filtered =
      filtered.filter((doc)=>{

        return(

          doc.title
          ?.toLowerCase()
          .includes(
            urlSearch
            .toLowerCase()
          )

          ||

          doc.description
          ?.toLowerCase()
          .includes(
            urlSearch
            .toLowerCase()
          )

          ||

          doc.discipline
          ?.toLowerCase()
          .includes(
            urlSearch
            .toLowerCase()
          )
        );
      });

      globalSearch.value =
      urlSearch;
    }

    renderResources(
      filtered
    );

  }catch(error){

    console.log(
      "URL Filter Error:",
      error
    );

    renderResources(
      allDocuments
    );
  }
}

/* =========================================
   SEARCH
========================================= */

globalSearch.addEventListener(
  "input",
  (e)=>{

    const value =
    e.target.value
    .toLowerCase()
    .trim();

    const filtered =
    allDocuments.filter((doc)=>{

      return(

        doc.title
        ?.toLowerCase()
        .includes(value)

        ||

        doc.description
        ?.toLowerCase()
        .includes(value)

        ||

        doc.discipline
        ?.toLowerCase()
        .includes(value)

        ||

        doc.tags
        ?.join(" ")
        .toLowerCase()
        .includes(value)
      );
    });

    renderResources(filtered);
  }
);

/* =========================================
   CATEGORY FILTER
========================================= */

categoryButtons.forEach((button)=>{

  button.addEventListener(
    "click",
    ()=>{

      const category =
      button.dataset.category;

      const filtered =
      allDocuments.filter((doc)=>{

        return(
          doc.category
          ===
          category
        );
      });

      renderResources(filtered);

      openPage(
        "resourcesPage"
      );
    }
  );
});

/* =========================================
   UPLOAD
========================================= */

uploadForm.addEventListener(
  "submit",
  async (e)=>{

    e.preventDefault();

    if(!currentUser){

      alert(
        "Please login first"
      );

      return;
    }

    try{

      const data = {

        category:
        document.getElementById(
          "category"
        ).value,

        discipline:
        document.getElementById(
          "discipline"
        ).value,

        title:
        document.getElementById(
          "title"
        ).value,

        description:
        document.getElementById(
          "description"
        ).value,

        tags:
        document
          .getElementById(
            "tags"
          )
          .value
          .split(","),

        documentId:
        document.getElementById(
          "documentId"
        ).value,

        pdfUrl:
        document.getElementById(
          "pdfUrl"
        ).value,

        userId:
        currentUser.uid,

        userName:
        currentUser.displayName,

        createdAt:
        serverTimestamp()
      };

      await addDoc(

        collection(
          db,
          "documents"
        ),

        data
      );

      alert(
        "Resource Uploaded"
      );

      uploadForm.reset();

      /* =========================================
   INIT
========================================= */

fetchDocuments();

/* -----------------------------------------
   SAFE TAB OPEN
----------------------------------------- */

try{

  const validTabs = [

    "resourcesPage",

    "examsPage",

    "learningPage",

    "placementPage",

    "contributionPage"
  ];

  if(

    urlTab
    &&
    validTabs.includes(urlTab)

  ){

    openPage(urlTab);

  }else{

    openPage(
      "resourcesPage"
    );
  }

}catch(error){

  console.log(
    "Tab Error:",
    error
  );

  openPage(
    "resourcesPage"
  );
}

/* -----------------------------------------
   DIRECT PDF
----------------------------------------- */

try{

  if(urlPdf){

    window.open(

      `${PDF_VIEWER}${encodeURIComponent(urlPdf)}`,

      "_blank"
    );
  }

}catch(error){

  console.log(
    "PDF Error:",
    error
  );
}

    }catch(error){

      console.log(error);
    }
  }
);

/* =========================================
   INITIAL LOAD
========================================= */

fetchDocuments();

openPage(
  "resourcesPage"
);