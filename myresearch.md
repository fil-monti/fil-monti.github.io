---
layout: page
title: Research
subtitle: MODELING EVOLUTION
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


[//]: # (<h2 class="subsection-title">Methodology</h2>)

[//]: # ()
[//]: # (- **Bayesian Statistics** — hierarchical and nonparametric modeling, probabilistic inference, and prior construction.)

[//]: # (- **Computational Statistics** — algorithmic development for high-dimensional models, Markov chain Monte Carlo &#40;MCMC&#41; and Hamiltonian Monte Carlo &#40;HMC&#41;.)

[//]: # (- **Applied Probability and Mathematical Biology** — continuous-time Markov chains &#40;CTMCs&#41; and diffusion models.)

[//]: # ()
[//]: # ([//]: # &#40;<hr style="margin:40px 0; border:none; border-top:1px solid #ddd;">&#41;)
[//]: # (<h2 class="subsection-title">Areas of Application</h2>)

[//]: # (- **Evolutionary Processes** — phylogenetics, phylogeography, phylodynamics, and coalescent theory.)

[//]: # (- **Epidemiology and Infectious Diseases** — statistical modeling of epidemic dynamics and viral evolution to uncover the ecological and demographic drivers of transmission.)


<div class="row gx-5 gy-4">
  <div class="col-lg-6">
    <h3 class="subsection-title">Methodology</h3>
    <ul>
      <li><strong>Bayesian Statistics</strong> — hierarchical and nonparametric modeling, probabilistic inference, and prior construction.</li>
      <li><strong>Computational Statistics</strong> — algorithmic development for high-dimensional models, Markov chain Monte Carlo (MCMC) and Hamiltonian Monte Carlo (HMC).</li>
      <li><strong>Applied Probability and Mathematical Biology</strong> — continuous-time Markov chains (CTMCs) and diffusion models.</li>
    </ul>
  </div>

  <div class="col-lg-6">
    <h3 class="subsection-title">Areas of Application</h3>
    <ul>
      <li><strong>Evolutionary Processes</strong> — phylogenetics, phylogeography, phylodynamics, and coalescent theory.</li>
      <li><strong>Epidemiology and Infectious Diseases</strong> — statistical modeling of epidemic dynamics and viral evolution to uncover the ecological and demographic drivers of transmission.</li>
    </ul>
  </div>
</div>


[//]: # (<div class="research-columns">)

[//]: # ()
[//]: # (  <div>)

[//]: # (    <h3 class="subsection-title">Methodology</h3>)

[//]: # (    <ul>)

[//]: # (      <li><b>Bayesian Statistics</b> — hierarchical and nonparametric modeling, probabilistic inference, and prior construction.</li>)

[//]: # (      <li><b>Computational Statistics</b> — algorithmic development for high-dimensional models, Markov chain Monte Carlo &#40;MCMC&#41; and Hamiltonian Monte Carlo &#40;HMC&#41;.</li>)

[//]: # (      <li><b>Applied Probability and Mathematical Biology</b> — continuous-time Markov chains &#40;CTMCs&#41; and diffusion models.</li>)

[//]: # (    </ul>)

[//]: # (  </div>)

[//]: # ()
[//]: # (  <div>)

[//]: # (    <h3 class="subsection-title">Areas of Application</h3>)

[//]: # (    <ul>)

[//]: # (      <li><b>Evolutionary Processes</b> — phylogenetics, phylogeography, phylodynamics, and coalescent theory.</li>)

[//]: # (      <li><b>Epidemiology and Infectious Diseases</b> — statistical modeling of epidemic dynamics and viral evolution to uncover the ecological and demographic drivers of transmission.</li>)

[//]: # (    </ul>)

[//]: # (  </div>)

[//]: # ()
[//]: # (</div>)

<div style="margin-top: 2.5rem;"></div>

<h2 class="section-title">Projects</h2>

<div class="papers">
{% include paper.html
title="Nonparametric Modeling of Continuous-Time Markov Chains"
authors="<strong>Monti, F.</strong>, Ji, X., and Suchard, M. A."
venue=""
year="2026+"
arxiv="http://arxiv.org/abs/2511.03954"
status="Manuscript submitted"
code="https://github.com/suchard-group/NonParametricModelingofCTMCs/blob/f5e29b8f3ec9cb7dfbe190f0c85c59f8780ea3ad/README.md#L4"
abstract="Inferring the infinitesimal rates of continuous-time Markov chains (CTMCs) is a central challenge in many scientific domains. 
This task is hindered by three factors: quadratic growth in the number of rates as the CTMC state space expands, strong dependencies among rates, and incomplete information for many transitions.
We introduce a new Bayesian framework that flexibly models the CTMC rates by incorporating covariates through Gaussian processes (GPs). 
This approach improves inference by integrating new information and contributes to the understanding of the CTMC stochastic behavior by shedding light on potential external drivers. 
Unlike previous approaches limited to linear covariate effects, our method captures complex non-linear relationships, enabling fuller use of covariate information and more accurate characterization of their influence.
To perform efficient inference, we employ a scalable Hamiltonian Monte Carlo (HMC) sampler.
We address the prohibitive cost of computing the exact likelihood gradient by integrating the HMC trajectories with a scalable gradient approximation, reducing the computational complexity from ${\cal O}(K^5)$ to ${\cal O}(K^2)$, where $K$ is the number of CTMC states.
Finally, we demonstrate our method on Bayesian phylogeography inference---a domain where CTMCs are central---showing effectiveness on both synthetic and real datasets."
%}

{% include paper.html
title = "Nonlinear Drivers of Population Dynamics: A Nonparametric Coalescent Approach"
authors = "<strong>Monti, F.</strong>, Faria, N. R., Hill, S., Shapiro, B., Ji, X., Lemey, P., Kraemer, M., and Suchard, M. A."
year = "2025+",
code="https://github.com/suchard-group/NonParametricModelingCoalescentProcesses",
status = "Manuscript submitted"
abstract = "Effective population size (\$N_e(t)\$) is a fundamental parameter in population genetics and phylodynamics that quantifies genetic diversity and reveals demographic history. 
Coalescent-based methods enable the inference of $N_e(t)$ trajectories through time from time-scaled phylogenies reconstructed from molecular sequence data. 
Understanding the ecological and environmental drivers of population dynamics requires linking $N_e(t)$ to external data such as climate or epidemiological variables. 
Existing approaches typically impose log-linear relationships between covariates and $N_e(t)$, which may fail to capture complex biological processes and can introduce bias when the true relationship is nonlinear.
We present a flexible Bayesian framework that integrates covariates into coalescent models with piecewise-constant $N_e(t)$ through a Gaussian process (GP) prior. 
The GP, a distribution over functions controlled by a kernel with data-driven hyperparameters, naturally accommodates nonlinear covariate effects without restrictive parametric assumptions. 
This formulation improves estimation of covariate-$N_e(t)$ relationships, mitigates bias when associations are nonlinear, and yields interpretable uncertainty quantification that varies across the covariate space. 
To balance global covariate-driven patterns with local temporal dynamics, we couple the GP prior with a Gaussian Markov random field that enforces smoothness in $N_e(t)$ trajectories. 
Efficient inference is achieved via Hamiltonian Monte Carlo over the high-dimensional latent field.
Through simulation studies and three empirical applications—yellow fever virus dynamics in Brazil (2016–2018), late-Quaternary musk ox demography, and HIV-1 CRF02\_AG evolution in Cameroon—we demonstrate that our method both confirms linear relationships where appropriate and reveals nonlinear covariate effects that would otherwise be missed or mischaracterized. 
This framework advances phylodynamic inference by enabling more accurate and biologically realistic modeling of how environmental and epidemiological factors shape population size through time."
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
