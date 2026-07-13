export const navItems = [
  { label: "Home", href: "/" },
  { label: "Research", href: "/myresearch/" },
  { label: "Papers", href: "/publications/" },
  { label: "Teaching", href: "/myteaching/" },
  { label: "Software", href: "/software/" },
  { label: "CV", href: "/cv/" }
];

export const profile = {
  name: "Filippo Monti",
  role: "PhD Candidate at University of California, Los Angeles (UCLA)",
  email: "fmonti@ucla.edu",
  github: "https://github.com/fil-monti",
  cv: "/assets/cv/FilippoMonti_CV.pdf",
  portrait: "/assets/img/myself.jpg",
  heroImage: "/assets/img/royceHall2.png",
  locationImage: "/assets/img/landscapeLA.png",
  teachingImage: "/assets/img/ComoSchool.jpg"
};

export const researchFocus = [
  {
    title: "Bayesian Statistics",
    body: "Hierarchical and nonparametric modeling"
  },
  {
    title: "Computational Statistics",
    body: "Scalable gradient-based inference."
  },
  {
    title: "Continuous-time Markov processes",
    body: "Continuous-time Markov chains (CTMCs), Poisson processes, diffusion processes."
  }
];

export const applicationAreas = [
  {
    title: "Evolutionary processes",
    body: "Phylogenetics, phylogeography, phylodynamics, and coalescent theory."
  },
  {
    title: "Epidemiology and infectious diseases",
    body: "Statistical modeling of epidemic dynamics and viral evolution."
  }
];

export const researchProjects = [
  {
    title: "Nonparametric Modeling of Continuous-Time Markov Chains with Scalable Exact and Approximate Gradients",
    authors: "Monti, F., Ji, X., Shao, Y., and Suchard, M. A.",
    year: "2026",
    status: "Under review",
    links: [
      { label: "arXiv", href: "https://arxiv.org/abs/2511.03954" },
      {
        label: "Code",
        href: "https://github.com/suchard-group/NonParametricModelingofCTMCs/blob/f5e29b8f3ec9cb7dfbe190f0c85c59f8780ea3ad/README.md#L4"
      }
    ],
    topics: ["CTMCs", "Gaussian processes", "Adjoint methods"],
    abstract: [
      "Inferring the infinitesimal rates of continuous-time Markov chains (CTMCs) is a central challenge in many scientific domains. This task is difficult because the number of rates grows quadratically with the state space, rates can be strongly dependent, and many transitions may be only partially observed. We introduce a Bayesian framework that models CTMC rates as flexible functions of covariates through Gaussian processes.",
      "This enables nonlinear covariate effects, improves inference by incorporating external information, and helps identify potential drivers of CTMC dynamics. For posterior inference, we use Hamiltonian Monte Carlo and develop scalable exact and approximate gradients for likelihoods involving repeated matrix exponentials.",
      "With N observations and K CTMC states, these gradients reduce the dominant cost of existing derivative calculations from O(NK^3), with large constants, to O(K^3 + NK^2), with cheaper constants. We demonstrate the method in Bayesian phylogenetic and phylogeographic inference, where CTMCs are central, and show strong performance on synthetic and real datasets, including empirical quadratic scaling in K even when N < K."
    ]
  },
  {
    title: "Nonlinear Drivers of Population Dynamics: A Nonparametric Coalescent Approach",
    authors:
      "Monti, F., Faria, N. R., Ji, X., Lemey, P., Kraemer, M., and Suchard, M. A.",
    year: "2026",
    status: "Under review",
    links: [
      { label: "arXiv", href: "https://arxiv.org/abs/2602.06148" },
      { label: "Code", href: "https://github.com/suchard-group/NonParametricModelingCoalescentProcesses" }
    ],
    topics: ["Coalescent processes", "Gaussian processes", "Phylodynamics"],
    abstract: [
      "Effective population size (Ne(t)) is a fundamental parameter in population genetics and phylodynamics that quantifies genetic diversity and reveals demographic history. Coalescent-based methods enable the inference of Ne(t) trajectories through time from phylogenies reconstructed from molecular sequence data. Understanding the ecological and environmental drivers of population dynamics requires linking Ne(t) to external covariates.",
      "Existing approaches typically impose log-linear relationships between covariates and Ne(t), which may fail to capture complex biological processes and can introduce bias when the true relationship is nonlinear. We present a flexible Bayesian framework that integrates covariates into coalescent models with piecewise-constant Ne(t) through a Gaussian process (GP) prior. The GP, a distribution over functions, naturally accommodates nonlinear covariate effects without restrictive parametric assumptions.",
      "This formulation improves estimation of covariate-Ne(t) relationships, mitigates bias under nonlinear associations, and yields interpretable uncertainty quantification that varies across the covariate space. To balance global covariate-driven patterns with local temporal dynamics, we couple the GP prior with a Gaussian Markov random field that enforces smoothness in Ne(t) trajectories.",
      "Through simulation studies and three empirical applications - yellow fever virus dynamics in Brazil (2016-2018), late-Quaternary musk ox demography, and HIV-1 CRF02-AG evolution in Cameroon - we demonstrate that our method both confirms linear relationships where appropriate and reveals nonlinear covariate effects that would otherwise be missed or mischaracterized.",
      "This framework advances phylodynamic inference by enabling more accurate and biologically realistic modeling of how environmental and epidemiological factors shape population size through time."
    ]
  },
  {
    title:
      "Unravelling the epidemiological and dispersal dynamics of the 2024-2025 chikungunya virus epidemic on Réunion island",
    authors:
      "Frumence, E., Klitting, R., Serres, K., Shao, Y., Monti, F., Vincent, M., Gill, M. S., Suchard, M. A., Lemey, P., de Lamballerie, X., Jaffar-Bandjee, M., and Dellicour, S.",
    year: "2026",
    status: "Under review",
    links: [
      { label: "DOI", href: "https://doi.org/10.64898/2026.01.07.26343606" },
      { label: "Europe PMC", href: "https://europepmc.org/article/ppr/ppr1251646" }
    ],
    topics: ["Chikungunya virus", "Phylogeography", "Phylodynamics"],
    abstract: [
      "This preprint studies the 2024-2025 chikungunya virus epidemic on Réunion island using a large genomic dataset and phylogeographic and phylodynamic methods to characterize the introduced transmission chain.",
      "The analyses point to gravity-like spatial dispersal among populated areas, frequent exchanges across residential areas, and associations between epidemic intensity and climate variables, while suggesting that population immunity from the recent and historical epidemics may help explain the epidemic decline."
    ]
  },
  {
    title:
      "Detecting Evolutionary Change-Points with Branch-Specific Substitution Models and Shrinkage Priors",
    authors:
      "Ji, X., Redelings, B., Su, S., Bao, H., Deng, W.-M., Monti, F., Hong, S. L., Baele, G., Lemey, P., and Suchard, M. A.",
    year: "2025",
    status: "Under review",
    links: [
      { label: "arXiv", href: "https://arxiv.org/abs/2507.08386" },
      { label: "PDF", href: "https://arxiv.org/pdf/2507.08386" }
    ],
    topics: ["Change-points", "Substitution models", "Shrinkage priors"],
    abstract: [
      "This preprint integrates branch-specific substitution models with shrinkage priors to identify evolutionary change-points without requiring prior knowledge of their locations on a phylogeny.",
      "The work develops a linear-time analytical gradient algorithm for branch-specific substitution parameters, enabling scalable maximum likelihood and Bayesian inference for high-dimensional substitution models.",
      "Applications include selection pressure dynamics in BRCA1 evolution in primates and mutational dynamics in viral sequences from the recent mpox epidemic."
    ]
  },
  // {
  //   title: "Markov Modulation via Reward Augmentation",
  //   authors: "Monti, F. and Suchard, M. A.",
  //   year: "2026+",
  //   status: "Manuscript in preparation",
  //   links: [],
  //   topics: ["Regime-switching"],
  //   abstract: []
  // },
  {
    title: "Investigating the drivers of time-varying rates of evolution",
    authors: "Monti, F., Lemey, P., and Suchard, M. A.",
    year: "2026+",
    status: "Manuscript in preparation",
    links: [],
    topics: ["CTMCs", "Diffusion processes", "Regime-switching"],
    abstract: [
      "Rates of evolution often depend on biological conditions that change through time, such as host type, ecological regime, geographic location, or phenotypic state. We propose a new class of Bayesian phylogenetic models in which evolutionary rates depend on an underlying, partially observed continuous-time Markov chain (CTMC). By explicitly modeling these latent biological processes, our framework enables formal inference on the factors driving evolutionary rate variation while improving the estimation of time-varying rates themselves.",
      "The approach provides two main advantages. First, it directly quantifies how different biological states influence evolutionary rates, yielding an interpretable statistical framework for testing biological hypotheses. Second, because inference on time-varying rates is often weakly identified from, e.g., sequence data alone, incorporating information from the underlying CTMC acts as a biologically motivated regularizer, improving both the accuracy and precision of rate estimates.",
      "Previous approaches have relied on full-path augmentation of the latent CTMC, leading to substantial computational overhead and poor scalability. In contrast, our method remains exact while avoiding latent-path sampling altogether. The key idea is to associate a learnable reward rate with each CTMC state and to interpret the cumulative reward-the time-weighted sum of state-specific rewards-as the evolutionary rate governing the dependent process. Crucially, the cumulative reward admits a tractable one-dimensional distribution, allowing exact, low-dimensional integration over the latent process.",
      "The framework applies broadly to both discrete and continuous evolutionary models, such as DNA and codon substitution models, Brownian motion, and Ornstein-Uhlenbeck processes. It also naturally accommodates multiple dependent processes simultaneously with essentially no additional computational cost, since conditioning on the cumulative rewards fully decouples these processes from the underlying CTMC."
    ]
  },
  {
    title:
      "Adjoint differentiation and many-core acceleration for scalable structured coalescent inference",
    authors:
      "Shao, Y., Monti, F., Gangavarapu, K., Ji, X., Lemey, P., Rambaut, A., Baele, G., and Suchard, M. A.",
    year: "2026+",
    status: "Manuscript in preparation",
    links: [],
    topics: ["Coalescent processes", "CTMCs", "Adjoint methods", "Many-core acceleration"],
    abstract: []
  },
  {
    title: "Modeling Random Positive Integrals with Squared Basis Expansions",
    authors: "Monti, F., and Suchard, M. A.",
    year: "2026+",
    status: "Manuscript in preparation",
    links: [],
    topics: ["Random positive integrals", "Basis expansions"],
    abstract: []
  },
  {
    title: "Stable Matrix Parametrizations and Structured Adjoints for Ornstein--Uhlenbeck Processes",
    authors: "Monti, F., Holbrook, A., Glatt-Holtz, N. E., and Suchard, M. A.",
    year: "2026+",
    status: "Manuscript in preparation",
    links: [],
    topics: ["Diffusion processes", "Ornstein-Uhlenbeck processes", "Adjoint methods", "Stable matrices"],
    abstract: [
      "Ornstein-Uhlenbeck process models with general multivariate drift matrices are attractive for continuous-time Gaussian modeling, but likelihood-based inference is difficult because the drift must remain Hurwitz stable and because each likelihood evaluation requires matrix exponentials and Lyapunov-equation computations. These operations are especially burdensome in gradient-based maximum likelihood and Bayesian inference, where derivatives through both the transition matrix and the stationary covariance are required.",
      "We introduce the Hurwitz smooth spectral block parametrization (H-SSBP), a stable drift representation based on a change of basis and independent scalar and two-dimensional spectral blocks. The H-SSBP enforces Hurwitz stability and connects monotone and oscillatory mean-reverting dynamics without discrete model selection. Under this parametrization, the OU transition matrix, stationary covariance, innovation covariance, and their reverse-mode derivatives decompose into closed-form blockwise computations plus change-of-basis multiplications. The resulting likelihood and gradient calculations avoid dense Schur-based matrix-function derivatives and global Lyapunov back-substitution, while retaining broad support over stable multivariate dynamics. We develop the corresponding exact Gaussian likelihood and structured adjoints for OU processes on directed graphs, with applications ranging from time series to tree-based models. Numerical experiments demonstrate substantial speed-ups for matrix-exponential adjoints and Lyapunov-equation kernels, while real-data analyses illustrate Bayesian inference under the proposed parametrization in financial and phylogenetic applications."
    ]
  }
];

export const teachingGroups = [
  {
    institution: "University of California, Los Angeles (UCLA)",
    role: "Teaching Assistant",
    image: "/assets/img/RoyceHall.jpg",
    entries: [
      { course: "Biostat 250C - Multivariate Biostatistics (Ph.D.)", term: "Spring 2026" },
      { course: "Biostat 250B - Linear Models (Ph.D.)", term: "Winter 2026" },
      { course: "Biostat 250A - Linear Models (Ph.D.)", term: "Fall 2025" },
      { course: "Biostat 100A / 100B - Introduction to Biostatistics", term: "Fall 2022 - Summer 2024" }
    ]
  },
  {
    institution: "Applied Bayesian Statistics School - Villa Grumello, Como (Italy)",
    role: "Co-lecturer, with Prof. Marc Suchard",
    image: "/assets/img/ComoSchool.jpg",
    entries: [{ course: "Bayesian Phylogenetics and Infectious Diseases", term: "Summer 2024" }]
  }
];

export const softwareEntries = [
  {
    title: "BEAST X",
    description:
      "A free cross-platform program for Bayesian analysis of molecular sequences using Markov chain Monte Carlo. Most of my projects include contributions to this software source code.",
    logo: "/assets/img/logos/beast-icon.png",
    site: "https://beast.community/",
    github: "https://github.com/beast-dev/beast-mcmc",
    tags: ["Bayesian phylogenetics", "MCMC", "Evolutionary analysis"]
  },
  {
    title: "BEAGLE",
    description:
      "A high-performance library for the core likelihood calculations used by Bayesian and maximum likelihood phylogenetics packages.",
    logo: "/assets/img/logos/beagle-logo.png",
    site: "https://beagle-dev.github.io/",
    github: "https://github.com/beagle-dev/beagle-lib",
    tags: ["GPU acceleration", "Likelihoods", "Phylogenetics"]
  }
];

export const footerLinks = [
  { label: "Email", href: `mailto:${profile.email}` },
  { label: "GitHub", href: profile.github }
];
