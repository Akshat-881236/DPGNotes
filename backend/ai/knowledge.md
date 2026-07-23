# DPGNotes AI Core Knowledge base

This document maps out DPGNotes' database architectures, advanced ranking formulas, and analytics algorithms.

## 1. Database Mappings
- **Users Collection (`users`):** Contains `uid`, `email`, `name`, `profilePic`, `bannerPic`, `bio`, `theme`, `linkedin`, `github`.
- **Documents Collection (`documents`):** Contains `userId`, `uploaderUid`, `title`, `description`, `category`, `discipline`, `likes` (array of UIDs), `shareCount`, `ctrCount`, `pdfUrl`.

## 2. Advanced Real-Time Analytics Algorithm
- To calculate engagement rates and CTR:
  $$\text{Engagement Rate (\%)} = \frac{\text{Likes} + \text{Shares}}{\text{Link Clicks}} \times 100$$
- This allows AI to report exact metrics dynamically.

## 3. High-Engagement Search Ranking Algorithm
- Documents are sorted by a composite engagement score:
  $$\text{Engagement Score} = (\text{Likes} \times 3.0) + (\text{Shares} \times 2.0) + (\text{Link Clicks} \times 1.0)$$
- The search engine uses this score to rank documents for user queries.
