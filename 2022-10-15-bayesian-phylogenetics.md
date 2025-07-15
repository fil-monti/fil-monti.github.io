---
layout: post
title: Bayesian Phylogenetics and Phylodynamics
---

Phylogenetics initially grew out of a desire to infer the tree of life (the phylogeny that links all living organisms on the planet).
These days, phylogenetic techniques are applied to study everything from the tree of life, to the spread of infectious diseases, to the developmental processes of organisms, and even to the evolution of human languages.

In the Suchard Group, we work to develop better and more efficient statistical inference frameworks for both phylogenetic and phylodynamic modeling.
Phylogenetic models are many and varied, but at the core of all of them is a phylogenetic tree.
A phylogenetic tree is a model of the evolutionary history of a set of genetic sequences, which tells us which sequences are most closely related to which, and when they diverged.
By adding additional information, like the [locations in which viruses were collected](https://pubmed.ncbi.nlm.nih.gov/29942656/) or [information about the niches species inhabit](https://royalsocietypublishing.org/doi/abs/10.1098/rspb.2022.0091), we can learn about anything from the spread of infectious diseases to the processes that shape biodiversity.
For a review on the sorts of things we can learn about using phylogenies, see [this review](https://www.annualreviews.org/doi/abs/10.1146/annurev-statistics-033021-112532) written by many in the group.

The study of the dynamics of the spread of infectious diseases with phylogenetic techniques is a field known as phylodynamics.
This unique pairing has spurred the development of many methods which are as applicable to phylogenetic analyses of [ancient DNA sequences](https://academic.oup.com/mbe/article/28/2/879/1212114) or the study of [floral evolution](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4820077/) as they are to the study of viral evolution and spread.
Thus, we find that there is a strong synergy between phylodynamic and phylogenetic research, and this is reflected in the many and varied applications of our methodology.

### Modeling high-dimensional (phylogenetic) data
Phylogenetic models tend to have many dimensions (different parameters that must be estimated), and this complexity grows as we add sequences to our dataset.
The Suchard Group is interested in developing models which can both appropriately capture the complexity of evolutionary processes across large trees and which are computationally efficient enough to be deployed at these scales.
Recent work in the group has explored a number of high-dimensional evolutionary questions, including:
- The rate of evolution of the rate of evolution, including efficient alternatives to the popular [random local clock model](https://arxiv.org/abs/2105.07119) for nucleotide substitution models and scaling up [relaxed random walk](https://academic.oup.com/sysbio/article/70/2/258/5873887) models.
- Correlations between traits which take discrete and continuous measurements, enabling the [detection of factors affecting pathogens' disease-causing capacities](https://projecteuclid.org/journals/annals-of-applied-statistics/volume-15/issue-1/Large-scale-inference-of-correlation-among-mixed-type-biological-traits/10.1214/20-AOAS1394.full) and [inference of plant-pollinator coevolution](https://arxiv.org/pdf/2201.07291.pdf).
- The use of [dimension-reduction to learn about coevolution](https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/2041-210X.13920), even with many dozens of traits. This enables inference on topics ranging from the domestication of beer yeast to mammalian life history evolution. Building on previous work, this can be done even in the face of [extreme amounts of missing data](https://www.tandfonline.com/doi/abs/10.1080/01621459.2020.1799812).
- Linking phylogenetic models with other highly-scalable models such as [Hawkes processes](https://academic.oup.com/bioinformatics/article/38/7/1846/6510960)

This work is done in the highly-cited phylogenetic software package [BEAST](https://beast.community/).

### Efficient phylogenetic inference
Bayesian phylogenetic inference is essentially all done via [Markov chain Monte Carlo](https://en.wikipedia.org/wiki/Markov_chain_Monte_Carlo).
The Suchard Group has a strong interest in using [Hamiltonian Monte Carlo](https://arxiv.org/abs/1701.02434) methods to improve inference performance.
In recent years, members of the Suchard lab have devised efficient inference techniques for a variety of components of time-calibrated phylogenetic models.
This includes work on [clock models](https://academic.oup.com/mbe/article/37/10/3047/5847600) (models of how the rate of evolution varies over the tree), [divergence-time estimation](https://arxiv.org/pdf/2110.13298.pdf) (estimating when different lineages of viruses and species split apart), and [nucleotide substitution models](https://arxiv.org/pdf/2303.13642.pdf) (the model of how different nucleotide bases in the genome change along the branches of the phylogeny).

In parallel, we work to exploit graphics processing units (GPUs) to make the brute-force computations necessary for phylogenetics faster.
This can make [likelihoods](https://academic.oup.com/bioinformatics/article/25/11/1370/332982) many orders of magnitudes faster, and recent work has shown similar improvements for the [gradients](https://arxiv.org/pdf/2303.04390.pdf) needed for Hamiltonian Monte Carlo.
This work lives in the [BEAGLE](https://academic.oup.com/sysbio/article/68/6/1052/5477405) library and API.
