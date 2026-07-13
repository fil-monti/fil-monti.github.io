---
title: Observational Health Data Science and OHDSI
description: Notes on real-world evidence, observational health data, and the OHDSI ecosystem.
tags: ["OHDSI", "real-world evidence", "health data"]
---

## Real-world evidence for health-related research

Observational studies have become an increasingly important part of health-related research. Observational health data, such as insurance claims, electronic health records, local registries, and spontaneous reports, stand as a rich source of information on real-world healthcare practice and patients and provide substantially larger sample sizes compared to data collected in clinical trials.

A very impactful application of real-world evidence is post-market safety surveillance on approved drugs, vaccines, or medical devices. Safety surveillance relies on real-world health data to monitor adverse events associated with exposure to drugs or biologics products, as rare and potentially severe events often remain undetected in clinical trials due to limited samples sizes. Examples include the [Vaccine Safety Datalink](https://www.cdc.gov/vaccinesafety/ensuringsafety/monitoring/vsd/index.html) by the US CDC, and [safety surveillance programs by CBER and CDER centers](https://www.fda.gov/files/drugs/published/Drug-and-Biologics-Safety-Surveillance-Best-Practice-Statement-Center-for-Drug-Evaluation-and-Research-%28CDER%29-Center-for-Biologics-Evaluation-Research-%28CBER%29-US-Food-and-Drug-Administration.pdf) of the US FDA.

Despite the success and great potential of leveraging real-world evidence, observational health data are not collected for the purpose of effectiveness or safety studies, and unlike data obtained in randomized clinical trials, observational data exhibit unmeasured or residual confounding and systematic errors that can bias analyses. Moreover, due to differences across healthcare systems, observational databases use very different formats and structures, as well as different vocabulary of diagnosis codes and differential inclusion of subject-level information. These practical issues present considerable challenges to reproducible, reliable, and open use of real-world evidence in observational health data.

## OHDSI: Observational Health Data Sciences and Informatics

Founded in 2014, [Observational Health Data Sciences and Informatics](https://ohdsi.org/) is a multi-stakeholder, interdisciplinary, open-science collaborative to bring out the value of health data through large-scale analytics.

OHDSI's mission is to improve health by empowering a community to collaboratively generate the evidence that promotes better health decisions and better care. To achieve this mission, the OHDSI community has worked collaboratively to establish critical components to address the challenges in observational health research:

- A common data model to unify data sources from health systems around the globe.
- A large-scale analytics toolstack to enable efficient, accurate, and privacy-preserving analysis on massive-scale health data.
- Diagnostics and calibration methods to diagnose data and study designs and produce more reliable evidence.
- Reproducible, open-science research from a network of federated data sources.

## The Observational Medical Outcomes Partnership common data model

OHDSI grew out of and expanded from OMOP, which was established in 2008. Some references on OMOP and the origins of OHDSI:

- Stang, Paul E., et al. ["Advancing the science for active surveillance: rationale and design for the Observational Medical Outcomes Partnership."](https://www.acpjournals.org/doi/full/10.7326/0003-4819-153-9-201011020-00010) Annals of Internal Medicine 153.9 (2010): 600-606.
- Overhage, J. Marc, et al. ["Validation of a common data model for active safety surveillance research."](https://academic.oup.com/jamia/article/19/1/54/734166) Journal of the American Medical Informatics Association 19.1 (2012): 54-60.
- Madigan, David, et al. ["A systematic statistical approach to evaluating evidence from observational studies."](https://www.annualreviews.org/doi/abs/10.1146/annurev-statistics-022513-115645) Annual Review of Statistics and Its Application 1 (2014): 11-39.
- Hripcsak, George, et al. ["Observational Health Data Sciences and Informatics (OHDSI): opportunities for observational researchers."](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4815923/) MEDINFO 2015: eHealth-enabled Health. IOS Press, 2015. 574-578.

## Large-scale analytics tools

[HADES](https://ohdsi.github.io/Hades/index.html), the OHDSI analytics toolstack, includes a comprehensive set of open-source R packages that provide high-efficiency implementation of functionalities and methods for observational research using large-scale databases.

## Methods research and development

OHDSI collaborators actively lead and participate in methodological research in order to enable and advance reproducible, reliable, scalable, and open-science research. Some example methods research:

- Suchard, Marc A., et al. ["Massive parallelization of serial inference algorithms for a complex generalized linear model."](https://dl.acm.org/doi/abs/10.1145/2414416.2414791) ACM Transactions on Modeling and Computer Simulation 23.1 (2013): 1-17.
- Schuemie, Martijn J., et al. ["Improving reproducibility by using high-throughput observational studies with empirical calibration."](https://royalsocietypublishing.org/doi/full/10.1098/rsta.2017.0356) Philosophical Transactions of the Royal Society A 376.2128 (2018): 20170356.

## Open-science collaborative research

OHDSI is an active community of collaborative research using a network of federated data sources from around the world. The [OHDSI Publications page](https://www.ohdsi.org/publications/) provides a long and growing list of publications by OHDSI collaborators.

Some example OHDSI network studies:

- The LEGEND open-science initiative and studies.
- Characterizing adverse events of special interest in 24 million patients with COVID-19, using 26 multinational databases.
