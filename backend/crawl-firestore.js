const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const rawB64 = "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6ImRwZ25vdGVzIiwicHJpdmF0ZV9rZXlfaWQiOiJhNTU4YzFmM2NkNDQ4ODk5YWJjYTUyNmM5MjAxNDQ2MWU2YWRmMmNlIiwicHJpdmF0ZV9rZXkiOiItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2QUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktZd2dnU2lBZ0VBQW9JQkFRQy9oTzZsT0RtZzlabkFcblA0ckhQMVFKQUgrTGlFUU5XVExVaVFUZmJ3NndMRXdJREQ5Z0V3M0Y2NmV1Mmp3VEJ5MGNiRTk4S3B4d2ZvelpcbkhvZ0VjSm91RTBDZGNCSkRBeC9IeFBhbE10cTJGRjkzdXZCZTZJQ1QvMVZ2Njd1Sng0MXdsZlAwMEg2b21mbG1cblVvT25wMmg4NUF4ZU9WZnZIeElHTGlaMlZJZkkrNmZYaEpka0VsVWNlRTZEcHE4WDdqN0c2Q2RIRDBlTVp0YVFcbjIyNlZSWm9IS2k1bGovZVNTMENCNjlsUm9VOWpxZHlLNlU4NnV0UE9XSFVBTUs3VzdqODZScnZDTUU3TW4wS1FcbndWYzJOWkZOczd2Mi82ZHdwVlFyTllkWlFFRWltdExhY0lVMXArdStGSjdCdW9qQkN6MkVhbHJ1WU5zOU5FY01cblR2aE0vS0tCQWdNQkFBRUNnZ0VBUkYvcnFXM1UyVHZGekFhRGY5WUNwUUlhQnhFN3BuNVpjTnFJTkZMY2JoWXFcbmdOY0tpenpTTm42SEM1eGJSVG5USjZvZGlJbFg5NnVla21kZGpTUThUMFhOVkVmdUpTR0k1NVBRc0xMaXRZMjVcbmRhLzJZQlBtejYraGE0ZEFHWlQyVUtNZ2lSOGtrUUlEc2IyMHhoYTA3WjJuTXI2TFA5SWFaNzF6T3R5NzY0c1pcbjFxVkh5VjR1K2lWZVhkZnpDMlcyV1FER3JVekw0b2dBVnRzS0JpVm5FSTlPL3RaSytheDFubERNOHVLTDJGTFNcbnZZRnFaTWt6WVRzUG44RjRRTzJEaU1FdUxmaGQ0eUFFZG1ySzNVbmI5K1R2Mis3cGplREtaTGRiSWxDZlorQ3RcbkJYTnpkbVd4VWthN1lBRHNFSjk2Z2loV1RDVnNPcGdVVXZPMk9wME9kd0tCZ1FEM0hFZ0hNbG41VlNxK2xLbWRcbmVBRXNCOW9BNDlLendXSkhXWFJDbm9ZbStReGo5dEpFcXZrUkFBeEJuUytGSlZON01RM0EyZHplOXpBOXdGbWlcbk5tNVF0UDgvMGFZbjR3WnhKaVlRb1dULzdrbWFGOEQwZ2VPS1h2MGZ5bWJ4SzI3Z1pDZWJyTnJYV2hNMEUzaVJcbnhCL01YSGFyUlVEbm9yN3hPNDFmQW5Td1p3S0JnUURHYUxHZFRPSGg4Vzh0NnpBK0lzRWJ0ZHVUdlhMQnZqcUhcbmJZRDVCTm9mUXVTdjhvMjc2Mnk4ck1sR1hBUkNXK1REdzhkdnB5Um41K01WcFNKSmozWU5WdVdFSDBEUnVTcUlcbnFhYzUzZGlBeERaMEhwa0g0aTBYclprbnEyNHBVaGxKcXlva0F4UnVZNVFIYmVHTWlLRVNnYXJIYjdVdEtQdDZcbkdMcGRWYUlrMXdLQmdGcCtRT0poemhGQTN5WnJ5ckdnQU0zZkVqYkJONmdjYWFFM1lSd0VjWnhVRi9XRHJmejNcbm43NWFCaU1CTFNYVlJYMFh1YkdtRnZ5UUNWcVQxajlSTDVUZXM1cnJhNjJ2dGV3NXpEYks0L0hWa1o2Y2xFejJcblJCMm9LNG80MVBuOHJkMyt6NEp6Q3JGU2l6WEc2NkIxOGk4a3JWQ0xTL21IMytUM3FnM2hHRnFCQW9HQUpWZnBcbkxqRWRScmg1YzR3VHJXNC9LR2NISi94OVQrZnMvalpuRXZlTjBscDF6b1A1bDBnTlZFbTFMRy8vUVRvb2lZd2NcbnluQU1FeDU3Q0VUbmVpN3RTajl6dlhWZ2J0aktINlRHMjhaY2pJZmhzK05hYkRodXdra2pUV3NmdGRsRTl5K25cbkk5WU1qMlpnb3pGVVJXNGwydVRhN3VTZ2xocGprcXg2enp4aDQwc0NnWUJsT01GakV4eUJTb0FCT2hwczRiajZcbnl3VjNmVW9hdWo3akY5M1hnWUFUckdhUWdsZ1lsKzMxQXlSSjkyOFBzUTBBeStYVVdlazBUanJIeXl3d1FVejhcbmJqTXVQMlYvenhBWUQyNXREZ0ZtSHl0dXlrL2dEc0h5emd0a0o5dUVOckl5OHY0OTdoV3dVSXJHTlZDdkNBSjRcbkp3eHZiTXZSeGQ3STduVFB4ZDBxYUE9PVxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwiY2xpZW50X2VtYWlsIjoiZmlyZWJhc2UtYWRtaW5zZGstZmJzdmNAZHBnbm90ZXMuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJjbGllbnRfaWQiOiIxMTAxODY0NzMwNTIzODAwNjIxODIiLCJhdXRoX3VyaSI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwidG9rZW5fdXJpIjoiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLCJjbGllbnRfeDUwOV9jZXJ0X3VybCI6Imh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvZmlyZWJhc2UtYWRtaW5zZGstZmJzdmMlNDBkcGdub3Rlcy5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInVuaXZlcnNlX2RvbWFpbiI6Imdvb2dsZWFwaXMuY29tIn0=";
const serviceAccount = JSON.parse(Buffer.from(rawB64, 'base64').toString('utf8'));
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function runCrawl() {
  console.log('[Crawler] Starting deep Firestore crawl...');
  const result = {
    crawledAt: new Date().toISOString(),
    contributors: [],
    pdfResources: [],
    assignmentSolutions: [],
    practicalSolutions: [],
    quizzes: []
  };

  // 1. Contributors
  const usersSnap = await db.collection('users').get();
  usersSnap.forEach(doc => {
    const d = doc.data();
    const isContrib = d.role === 'contributor' || d.isContributor || (d.email && d.email.includes('akshat')) || (d.uploadedDocsCount && d.uploadedDocsCount > 0);
    if (isContrib || doc.id.length > 15) {
      result.contributors.push({
        uid: doc.id,
        name: d.name || d.displayName || d.username || (d.email ? d.email.split('@')[0] : 'Verified Contributor'),
        email: d.email || '',
        avatar: d.avatar || d.photoURL || '',
        role: d.email === 'its.akshatnetworkhub23@gmail.com' ? 'Platform Administrator & Lead Contributor' : (d.role || 'Verified Contributor'),
        profileUrl: 'https://dpgnotes.web.app/profile.html?uid=' + doc.id
      });
    }
  });

  // 2. PDF Documents
  const docsSnap = await db.collection('documents').get();
  docsSnap.forEach(doc => {
    const d = doc.data();
    const docId = d.documentId || doc.id;
    if (docId) {
      result.pdfResources.push({
        id: docId,
        title: d.title || 'Academic Educational Resource',
        subject: d.discipline || d.subject || 'General Academic',
        category: d.category || 'Notes',
        description: d.description || ('Verified university study notes for ' + (d.discipline || d.subject || 'students') + '.'),
        tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
        uploader: d.userName || d.uploader || d.uploaderEmail || 'Verified Contributor',
        uploaderEmail: d.uploaderEmail || '',
        url: 'https://dpgnotes.web.app/dpgnotes-pdf-viewer.html?resourceId=' + encodeURIComponent(docId)
      });
    }
  });

  // 3. Solutions (Practical & Assignment via collectionGroup)
  const solSnap = await db.collectionGroup('solutions').get();
  solSnap.forEach(doc => {
    const d = doc.data();
    const solId = d.id || doc.id;
    const path = doc.ref.path;
    const isPractical = path.includes('practical_solutions') || (solId && solId.startsWith('prac_'));
    const item = {
      id: solId,
      title: d.subjectName ? (d.subjectName + ' (' + (d.course || d.subjectCode || 'Solution') + ')') : (d.subjectCode || 'Academic Solution'),
      subject: d.subjectName || d.subjectCode || 'Academic Course',
      course: d.course || d.courseSec || 'University Course',
      contributorUid: d.contributorUid || '',
      contributorName: d.studentName || d.contributorName || 'Verified Contributor',
      contributorEmail: d.contributorEmail || d.uploaderEmail || '',
      description: isPractical 
        ? ('Verified practical lab experiments, algorithms, and source code for ' + (d.subjectName || solId) + '.')
        : ('Verified academic assignment solution with questions and step-by-step answers for ' + (d.subjectName || solId) + '.'),
      tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || (d.subjectCode + ', ' + (d.course || ''))),
      url: isPractical 
        ? ('https://dpgnotes.web.app/PracticalSolution/index.html?id=' + encodeURIComponent(solId))
        : ('https://dpgnotes.web.app/AssignmentSolution/index.html?id=' + encodeURIComponent(solId))
    };
    if (isPractical) {
      result.practicalSolutions.push(item);
    } else {
      result.assignmentSolutions.push(item);
    }
  });

  // 4. Quizzes
  const qzSnap = await db.collection('quizDirectory').get();
  qzSnap.forEach(doc => {
    const d = doc.data();
    const qzId = d.quizId || doc.id;
    if (qzId) {
      result.quizzes.push({
        id: qzId,
        title: d.title || 'Online Academic Examination',
        subject: d.subjectCode || d.subjectName || 'Academic Assessment',
        ownerName: d.ownerName || 'Verified Educator',
        ownerUid: d.ownerUid || '',
        totalQuestions: d.totalQuestions || 0,
        description: d.description || ('Online examination and subject assessment on ' + (d.title || qzId) + '.'),
        tags: Array.isArray(d.topicTags) ? d.topicTags.join(', ') : (d.topicTags || d.tags || ''),
        url: 'https://dpgnotes.web.app/Quizes/index.html?quizId=' + encodeURIComponent(qzId)
      });
    }
  });

  const outPath = path.join(__dirname, 'crawled_firestore_sitemap.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('[Crawler] Deep crawl successful!');
  console.log(' - Contributors:', result.contributors.length);
  console.log(' - PDF Resources:', result.pdfResources.length);
  console.log(' - Practical Solutions:', result.practicalSolutions.length);
  console.log(' - Assignment Solutions:', result.assignmentSolutions.length);
  console.log(' - Quizzes:', result.quizzes.length);
  console.log('[Crawler] Saved to:', outPath);
}

runCrawl().catch(err => {
  console.error('[Crawler] Error:', err);
  process.exit(1);
});
