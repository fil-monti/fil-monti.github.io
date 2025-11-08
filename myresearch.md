---
layout: page
title: Research
subtitle: Modeling Evolution
permalink: /myresearch/
header:
  compact: true           # adds .header--compact (tight spacing)
  subtitle_style: 'span'  # 'span' (with <hr>) or 'h2'
  show_post_meta: false   # hide date/readtime
  force_no_img: false     # ignore cover-img even if set (set to true to force no-image)
---

<h2 class="section-title">Research Interests</h2>
My research develops Bayesian statistical methods for modeling stochastic processes in biological and epidemiological systems. 
By integrating computational statistics, applied probability, and evolutionary biology, I work to understand how these complex systems evolve and change over time.

<h2 class="subsection-title">Methodology</h2>

- **Bayesian Statistics** — hierarchical and nonparametric modeling, probabilistic inference, and prior construction.
- **Computational Statistics** — algorithmic development for high-dimensional models, Markov chain Monte Carlo (MCMC) and Hamiltonian Monte Carlo (HMC).
- **Applied Probability and Mathematical Biology** — continuous-time Markov chains (CTMCs) and diffusion models.

[//]: # (<hr style="margin:40px 0; border:none; border-top:1px solid #ddd;">)
<h2 class="subsection-title">Areas of Application</h2>
- **Evolutionary Processes** — phylogenetics, phylogeography, phylodynamics, and coalescent theory.
- **Epidemiology and Infectious Diseases** — statistical modeling of epidemic dynamics and viral evolution to uncover the ecological and demographic drivers of transmission.



<h2 class="section-title">Projects</h2>

<div class="papers">
{% include paper.html
title="Nonparametric Modeling of Continuous-Time Markov Chains"
authors="<strong>Monti, F.</strong>, Ji, X., and Suchard, M. A."
venue=""
year="2025+"
arxiv="http://arxiv.org/abs/2511.03954"
status="Manuscript under review"
code="https://github.com/suchard-group/NonParametricModelingofCTMCs/blob/f5e29b8f3ec9cb7dfbe190f0c85c59f8780ea3ad/README.md#L4"
abstract="We develop GP-based priors on CTMC transition rates to capture covariate and temporal dependence. Efficient inference is obtained via matrix–exponential likelihood structure; applications to large phylogenies demonstrate scalability."
%}

{% include paper.html
title = "Nonlinear Drivers of Population Dynamics: A Nonparametric Coalescent Approach"
authors = "<strong>Monti, F.</strong>, Faria, N. R., Hill, S., Shapiro, B., Ji, X., Lemey, P., Kraemer, M., and Suchard, M. A."
year = "2025+"
status = "Pre-print coming soon"
abstract = "Effective population size (\$N_e(t)\$) is a fundamental parameter in population genetics and phylodynamics that quantifies genetic diversity and reveals demographic history.
Coalescent-based methods infer $N_e(t)$ trajectories through time from time-scaled phylogenies reconstructed from molecular sequence data.
Understanding the ecological and environmental drivers of population dynamics requires linking $N_e(t)$ to external covariates such as climate or epidemiological variables.
Existing approaches typically impose log-linear relationships between covariates and $N_e(t)$, which may fail to capture complex biological processes and can introduce bias when the true relationship is nonlinear.
We present a flexible Bayesian framework that integrates covariates into coalescent models with piecewise-constant $N_e(t)$ through a Gaussian process (GP) prior.
The GP, a distribution over functions controlled by a kernel with data-driven hyperparameters, naturally accommodates nonlinear covariate effects without restrictive parametric assumptions.
This formulation improves estimation of covariate-$N_e(t)$ relationships, mitigates bias when associations are nonlinear, and yields interpretable uncertainty quantification that varies across the covariate space.
To balance global covariate-driven patterns with local temporal dynamics, we couple the GP prior with a Gaussian Markov random field that enforces smoothness in $N_e(t)$ trajectories."
%}

{% include paper.html
title = "Dependencies Between Stochastic Processes Over Trees"
authors = "<strong>Monti, F.</strong> and Suchard, M. A."
year = "2025+"
status = "Manuscript in preparation"
%}

{% include paper.html
title = "Scalable Ornstein–Uhlenbeck Processes Over Trees"
authors = "<strong>Monti, F.</strong>, Holbrook, A., and Suchard, M. A."
year = "2025+"
status = "Manuscript in preparation"
%}
</div>


[//]: # ()
[//]: # (## Broader Goal)

[//]: # ()
[//]: # (My research aims to unify **probabilistic modeling, evolutionary theory, and computation** by designing Bayesian nonparametric methods that reveal how biological and epidemiological processes evolve over time. This includes creating scalable algorithms that bridge **stochastic process theory** and **inference on complex trees and networks**.)
