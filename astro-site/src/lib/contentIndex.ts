import { navItems, researchProjects, softwareEntries, teachingGroups } from "../data/site";

export type SearchEntry = {
  title: string;
  href: string;
  category: string;
  description: string;
  tags?: string[];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function getSearchEntries(): SearchEntry[] {
  return [
    ...navItems.map((item) => ({
      title: item.label,
      href: item.href,
      category: "Page",
      description: `${item.label} page on Filippo Monti's academic website.`
    })),
    ...researchProjects.map((project) => ({
      title: project.title,
      href: `/publications/#paper-${slugify(project.title)}`,
      category: "Research",
      description: `${project.status}. ${project.authors}`,
      tags: project.topics
    })),
    ...teachingGroups.flatMap((group) =>
      group.entries.map((entry) => ({
        title: entry.course,
        href: "/myteaching/",
        category: "Teaching",
        description: `${group.role}, ${group.institution}. ${entry.term}`
      }))
    ),
    ...softwareEntries.map((entry) => ({
      title: entry.title,
      href: "/software/",
      category: "Software",
      description: entry.description,
      tags: entry.tags
    }))
  ];
}
