# Shadow clustering: 2026-10-30 exploratory review

Run `42f3e5e4-e206-4686-a46f-ab5fc8f8339b`, matcher `shadow-event-2.0.1`. Local data only. 453 feed entries became 446 stored candidate URLs. The clustering run used these 446 rows and no model requests: 430 shadow clusters, 16 confirmed comparisons, 84 provisional comparisons and 26 rejected comparisons. These counts are pair decisions, not 126 unique articles. One confirmed comparison joined two direct publisher groups; this does not establish independently verified reporting. No publication or editorial changes were made.

The following examples are **an assistant's preliminary title-only triage**, not an independent human-verified gold set. They are deliberately selected from retrieved results, not a representative random sample. `reviewer_label` is blank until a human editor examines the original reporting with the necessary access rights. Do not calculate an accuracy rate or infer that the 98% target has been met from these examples.

| Candidate ID | Representative ID | Recorded | Preliminary review cue | reviewer_label |
| --- | --- | --- | --- | --- |
| b93d078a7d2e7ad8c8a6e737 | 0d8a801d720fd99ea623ab58 | confirmed | SBS and Yonhap: industry request for crypto-tax delay and ruling party timeline; plausibly same reported event. | pending |
| eed438e4935a467f38a7ca5f | 0d8a801d720fd99ea623ab58 | provisional | Electronic Times and Yonhap: same request and timeline appear likely related; review whether the same event. | pending |
| 71f1499a10e26612447793b9 | 8ef31d97fc302261a2c029cf | provisional | SBS and Yonhap: remarks about the same named lawmakers appear likely related. | pending |
| e765efe47cd0836a100b9758 | 23c7cfd2bd759f3c65d5028f | provisional | SBS and Yonhap: party report on the same investigation appears likely related. | pending |
| f376ac934f737f6772c1fb4b | 3f9346e20039609686f47baa | provisional | SBS and Yonhap: matching poll figures appear likely to be the same poll. | pending |
| eed438e4935a467f38a7ca5f | 7c19172f949f22c49b004a00 | provisional | Crypto-tax policy is shared; an opposition party's pressure may be a distinct event from the industry's request. | pending |
| eed438e4935a467f38a7ca5f | 3d90661996b51e3ee1a4ac01 | provisional | Crypto-tax request versus a separately announced meeting; related topic alone is insufficient. | pending |
| eed438e4935a467f38a7ca5f | 6c9caaef8defc08145cda381 | provisional | Crypto-tax request versus a report about North Korean IT workers; same broad term is not enough. | pending |

Known limitation: the first run recovered a direct cross-publisher pair, but left several apparently matching differently worded pairs provisional. There is insufficient reviewed evidence to estimate false-merge rate or recall. Build a blinded, stratified, independently human-labelled sample including automatic confirmations, provisional pairs, rejects, and pairs missed during candidate retrieval. Record label uncertainty and reviewer disagreement, and use that sample to estimate precision and recall before any cutover.
