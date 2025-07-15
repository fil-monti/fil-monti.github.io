---
layout: post
title: Observational Health Data Science and OHDSI

---

## Real-world evidence for health-related research

Observational studies have become an increasingly important part of health-related research. 
Observational health data, such as insurance claims, electronic health records (EHR), local registries, and spontaneous reports, stand as a rich source of information on real-world healthcare practice and patients and provide substantially larger sample sizes compared to data collected in clinical trials. 

A very impactful application of real-world evidence is post-market safety surveillance on approved drugs, vaccines, or medical devices. 
Safety surveillance relies on real-world health data to monitor adverse events associated with exposure to drugs or biologics products, as rare and potentially severe often times remain undetected in clinical trials due to limited samples sizes. 
Examples include the [Vaccine Safety Datalink (VSD)](https://www.cdc.gov/vaccinesafety/ensuringsafety/monitoring/vsd/index.html) by the US CDC, and [safety surveillance programs by CBER and CDER centers](https://www.fda.gov/files/drugs/published/Drug-and-Biologics-Safety-Surveillance-Best-Practice-Statement-Center-for-Drug-Evaluation-and-Research-%28CDER%29-Center-for-Biologics-Evaluation-and-Research-%28CBER%29-US-Food-and-Drug-Administration.pdf) of US FDA. 
During the recent COVID-19 vaccination program, for instance, [a myriad of safety surveillance studies](https://www.cdc.gov/coronavirus/2019-ncov/vaccines/safety/adverse-events.html) reported several adverse events as rare severe reactions after COVID-19 vaccination, including anaphylaxis, thrombosis with thrombocytopenia syndrome (TTS), and Guillain-Barré syndrome (GBS). 

Despite the success and great potential of leveraging real-world evidence, observational health data are not collected for the purpose of effectiveness or safety studies, and unlike data obtained in randomized clinical trials, observational data exhibit unmeasured or residual confounding and systematic errors that can bias analyses. 
Moreover, due to differences across healthcare systems, observational databases use very different formats and structures, as well as different vocabulary of diagnosis codes and differential inclusion of subject-level information. 
These practical issues present considerable challenges to reproducible, reliable and open use of real-world evidence in observational health data. 

## OHDSI: Observational Health Data Sciences and Informatics

Founded in 2014, [Observational Health Data Sciences and Informatics](https://ohdsi.org/) (OHDSI, pronounced “Odyssey”) is a multi-stakeholder, interdisciplinary, open-science collaborative to bring out the value of health data through large-scale analytics.
As an international community, OHDSI now has more than 2,000 collaborators from 74 countries and more than 800 million unique patient records across the world. 

OHDSI's mission is to improve health by empowering a community to collaboratively generate the evidence that promotes better health decisions and better care. 
To achieve this mission, the OHDSI community has worked collaboratively to establish the following critical components to address the great challenges in observational health research:

- **Common data model (CDM)** to unify data sources from health systems around the globe
- **Large-scale analytics toolstack** to enable efficient, accurate and privacy-preserving analysis on massive-scale health data
- **Diagnostics and calibration methods development** to diagnose data and study designs and perform calibration to produce more reliable evidence
- **Reproducible, open-science research** to generate evidence from a network of federated data sources and disseminate findings openly


Below we provide some links and references regarding these aspects. 

### The Observational Medical Outcomes Partnership (OMOP) CDM

OHDSI grew out of and expanded from OMOP, which was established in 2008. 
Some references on OMOP and the origins of OHDSI:

- Stang, Paul E., et al. ["Advancing the science for active surveillance: rationale and design for the Observational Medical Outcomes Partnership."](https://www.acpjournals.org/doi/full/10.7326/0003-4819-153-9-201011020-00010?casa_token=O2xLFhYpUCUAAAAA%3AnENPnsT78dA_HVkulU4dWjdYDh1sbmpTvYLSQDXP8LGdZJbT1HeRUTfTRTIBGBUU_BFgghL6CrXBEF65) Annals of internal medicine 153.9 (2010): 600-606.
- Overhage, J. Marc, et al. ["Validation of a common data model for active safety surveillance research."](https://academic.oup.com/jamia/article/19/1/54/734166) Journal of the American Medical Informatics Association 19.1 (2012): 54-60. 
- Madigan, David, et al. ["A systematic statistical approach to evaluating evidence from observational studies."](https://www.annualreviews.org/doi/abs/10.1146/annurev-statistics-022513-115645) Annual Review of Statistics and Its Application 1 (2014): 11-39.
- Hripcsak, George, et al. ["Observational Health Data Sciences and Informatics (OHDSI): opportunities for observational researchers."](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4815923/) MEDINFO 2015: eHealth-enabled Health. IOS Press, 2015. 574-578. 

### Large-scale analystics tools

[HADES](https://ohdsi.github.io/Hades/index.html), the OHDSI analytics toolstack, includes a comprehensive set of open-source _R_ packages that provide high-efficiency implementation of functionalities and methods for observational research using large-scale databases. 
The HADES package suite (see the [Packages page](https://ohdsi.github.io/Hades/packages.html)) facilitates the user at every step of the data analytics pipeline, from data source interaction, cohort construction and characterization, feature building and extraction, estimation and prediction modeling fitting, data and study diagnostics, and results dissemination. 

### Methods research and development

OHDSI collaborators actively lead and participate in methodological research in order to enable and advance reproducible, reliable, scalable and open-science research. 

Some example methods research:

- Suchard, Marc A., et al. ["Massive parallelization of serial inference algorithms for a complex generalized linear model."](https://dl.acm.org/doi/abs/10.1145/2414416.2414791?casa_token=KSCMSzPGWboAAAAA:50d3lLYZf4LlbgYizcJebMnl-6UktDg8ycUax-QDj6XqlO2ZgiSUTU0ToYTeO2N53gbKkP6i3rW3Wzk) ACM Transactions on Modeling and Computer Simulation (TOMACS) 23.1 (2013): 1-17. 
	* Implementation provided by the [**Cyclops**](https://github.com/OHDSI/Cyclops) _R_ package. 
- Schuemie, Martijn J., et al. ["Improving reproducibility by using high-throughput observational studies with empirical calibration."](https://royalsocietypublishing.org/doi/full/10.1098/rsta.2017.0356) Philosophical Transactions of the Royal Society A: Mathematical, Physical and Engineering Sciences 376.2128 (2018): 20170356.
	* Implementaion provided by the [**EmpiricalCalibration**](https://github.com/OHDSI/EmpiricalCalibration) _R_ package. 


### Open-science collaborative research

OHDSI is an extremely active community of collaborative research using a network of federated data sources from around the world. 
The [OHDSI Publications page](https://www.ohdsi.org/publications/) provides a long and growing list of publications by OHDSI collaborators. 

Some example OHDSI network studies:

- The LEGEND open-science initiative and studies:
	* Schuemie, Martijn J., et al. ["Principles of large-scale evidence generation and evaluation across a network of databases (LEGEND)."](https://academic.oup.com/jamia/article/27/8/1331/5895561) Journal of the American Medical Informatics Association 27.8 (2020): 1331-1337.
	* Suchard, Marc A., et al. ["Comprehensive comparative effectiveness and safety of first-line antihypertensive drug classes: a systematic, multinational, large-scale analysis."](https://www.sciencedirect.com/science/article/pii/S0140673619323177) The Lancet 394.10211 (2019): 1816-1826.

- Characterizing adverse events of special interests in 24 million patients with COVID-19, using 26 multinational databases:
	* Largest OHDSI network study (by number of databases) to date
	* Voss, Erica A., et al. ["Contextualising adverse events of special interest to characterise the baseline incidence rates in 24 million patients with COVID-19 across 26 databases: a multinational retrospective cohort study."](https://www.thelancet.com/journals/eclinm/article/PIIS2589-5370%2823%2800109-8/fulltext) Eclinicalmedicine 58 (2023).
