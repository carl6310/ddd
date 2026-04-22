import { ProjectWorkbench } from "@/components/project-workbench";
import { getProjectBundle, listProjects, listSampleArticles } from "@/lib/repository";

export default function HomePage() {
  const projects = listProjects();
  const samples = listSampleArticles();
  const initialSelectedBundle = projects[0] ? getProjectBundle(projects[0].id) : null;

  return <ProjectWorkbench initialProjects={projects} initialSamples={samples} initialSelectedBundle={initialSelectedBundle} />;
}
