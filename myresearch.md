---
layout: page
title: Research
subtitle: Modeling Evolution
permalink: /myresearch/
---

## Research Interests
My research develops Bayesian and stochastic-process models to understand how biological and epidemiological systems evolve over time. I work at the intersection of computational statistics, probability theory, and evolutionary biology.


### Methodology
- **Bayesian Statistics** — hierarchical and nonparametric modeling, probabilistic inference, and prior construction.
- **Computational Statistics** — algorithmic development for high-dimensional models, Markov chain Monte Carlo (MCMC) and Hamiltonian Monte Carlo (HMC).
- **Applied Probability and Mathematical Biology** — continuous-time Markov chains (CTMCs) and diffusion models.

[//]: # (<hr style="margin:40px 0; border:none; border-top:1px solid #ddd;">)

### Areas of Application
- **Evolutionary Processes** — phylogenetics, phylogeography, phylodynamics, and coalescent theory.
- **Epidemiology and Infectious Diseases** — statistical modeling of epidemic dynamics and viral evolution to uncover the ecological and demographic drivers of transmission.

---

## Projects


{% include paper.html
title = "Nonparametric Modeling of Continuous-Time Markov Chains"
authors = "**Monti, F.**, Ji, X., and Suchard, M. A."
venue = ""
year = "2025"
status = "Manuscript under review"
arxiv = "https://arxiv.org/abs/2501.01234"
pdf = ""
code = ""
link = ""
abstract = "We develop GP-based priors on CTMC transition rates to capture covariate and temporal dependence. Efficient inference is obtained via matrix–exponential likelihood structure; applications to large phylogenies demonstrate scalability."
%}

{% include paper.html
title = "Nonlinear Drivers of Population Dynamics: A Nonparametric Coalescent Approach"
authors = "**Monti, F.**, Faria, N. R., Hill, S., Shapiro, B., Ji, X., Lemey, P., Kraemer, M., and Suchard, M. A."
year = "2025"
status = "Manuscript in preparation"
abstract = "We couple effective population size trajectories to nonlinear covariates using Bayesian nonparametrics, deriving inference under coalescent likelihoods and providing identifiability guidance under partial observation."
%}

{% include paper.html
title = "Dependencies Between Stochastic Processes Over Trees"
authors = "**Monti, F.** and **Suchard, M. A.**"
status = "Manuscript in preparation"
abstract = "We model two-way dependence among continuous and discrete traits via coupled processes defined on phylogenies, enabling joint inference of substitution dynamics and trait diffusion."
%}

{% include paper.html
title = "Scalable Ornstein–Uhlenbeck Processes Over Trees"
authors = "**Monti, F.**, Holbrook, A., and Suchard, M. A."
status = "Manuscript in preparation"
abstract = "We construct OU processes with Kronecker-structured inference for large trees, enabling gradient-based computation and flexible covariance modeling."
%}

[//]: # (**Non-Parametric Modeling of Continuous-Time Markov Chains**              )

[//]: # (**Monti, F.**, Ji X., and Suchard, M. A.         )

[//]: # (A novel Bayesian framework for learning CTMC transition rates as flexible stochastic processes over covariates.  )

[//]: # (*Manuscript under review.*)

[//]: # (<div class="accordion" id="papers">)

[//]: # (  <div class="accordion-item">)

[//]: # (    <h2 class="accordion-header" id="headingOne">)

[//]: # (      <button class="accordion-button collapsed" type="button")

[//]: # (              data-bs-toggle="collapse" data-bs-target="#collapseOne")

[//]: # (              aria-expanded="false" aria-controls="collapseOne">)

[//]: # (        Nonparametric Modeling of Continuous-Time Markov Chains &#40;2025&#41;)

[//]: # (      </button>)

[//]: # (    </h2>)

[//]: # (    <div id="collapseOne" class="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#papers">)

[//]: # (      <div class="accordion-body">)

[//]: # (        Abstract: This work develops Gaussian-process priors …)

[//]: # (      </div>)

[//]: # (    </div>)

[//]: # (  </div>)

[//]: # (</div>)

[//]: # (**Non-Linear Drivers of Population Dynamics: A Nonparametric Coalescent Approach**       )

[//]: # (**Monti, F.**, Faria, N. R., Shapiro, B., Ji, X., Lemey, P., Kraemer, M., and Suchard, M. A.   )

[//]: # (Developing a coalescent-based model that infers population size trajectories driven by nonlinear, time-varying covariates.  )

[//]: # (*Manuscript in preparation.*)

[//]: # ()
[//]: # (**Dependencies Between Stochastic Processes Over Trees**   )

[//]: # (**Monti, F.** and Suchard, M. A.  )

[//]: # (Modeling evolution of continuous and discrete traits dependent on underlying partially observed stochastic processes.  )

[//]: # (*Manuscript in preparation.*)

[//]: # ()
[//]: # (**Scalable and Flexible Ornstein–Uhlenbeck Processes Over Trees**   )

[//]: # (**Monti, F.**, Holbrook, A., and Suchard, M. A.  )

[//]: # (Extending Ornstein–Uhlenbeck diffusions to large phylogenies via scalable Hamiltonian Monte Carlo inference.  )

[//]: # (*Manuscript in preparation.*)

[//]: # (---)

[//]: # ()
[//]: # (## Broader Goal)

[//]: # ()
[//]: # (My research aims to unify **probabilistic modeling, evolutionary theory, and computation** by designing Bayesian nonparametric methods that reveal how biological and epidemiological processes evolve over time. This includes creating scalable algorithms that bridge **stochastic process theory** and **inference on complex trees and networks**.)
