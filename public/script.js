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

    <a
      href="${PDF_VIEWER}=${encodeURIComponent(data.pdfUrl)}"
      target="_blank"
      class="open-btn"
    >

      Open PDF

    </a>

  </article>

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

    renderResources(
      allDocuments
    );

  }catch(error){

    console.log(error);
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

      fetchDocuments();

      openPage(
        "resourcesPage"
      );

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