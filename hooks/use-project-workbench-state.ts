"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArticleProject, ProjectBundle, SampleArticle } from "@/lib/types";
import type { StaleArtifact } from "@/components/workbench/workflow-state";

const staleArtifactsStorageKey = "workbench-stale-artifacts";

export function useProjectWorkbenchState({
  initialProjects,
  initialSamples,
  initialSelectedBundle,
  onError,
}: {
  initialProjects: ArticleProject[];
  initialSamples: SampleArticle[];
  initialSelectedBundle: ProjectBundle | null;
  onError?: (message: string) => void;
}) {
  const [projects, setProjects] = useState(initialProjects);
  const [samples] = useState(initialSamples);
  const [selectedProjectId, setSelectedProjectId] = useState(initialSelectedBundle?.project.id ?? initialProjects[0]?.id ?? "");
  const [selectedBundle, setSelectedBundle] = useState<ProjectBundle | null>(initialSelectedBundle);
  const [staleArtifactsByProject, setStaleArtifactsByProject] = useState<Record<string, StaleArtifact[]>>({});

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(staleArtifactsStorageKey);
      if (stored) {
        setStaleArtifactsByProject(JSON.parse(stored) as Record<string, StaleArtifact[]>);
      }
    } catch {
      setStaleArtifactsByProject({});
    }
  }, []);

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedBundle(null);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${selectedProjectId}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "读取项目失败。");
        }
        setSelectedBundle(payload.bundle);
      } catch (error) {
        onError?.(error instanceof Error ? error.message : "读取项目失败。");
      }
    })();
  }, [onError, selectedProjectId]);

  const sampleDigest = useMemo(
    () =>
      samples
        .slice(0, 5)
        .map((sample, index) => `${index + 1}. ${sample.title} | ${sample.articleType} | ${sample.coreThesis}`)
        .join("\n"),
    [samples],
  );

  const refreshProjectsAndBundle = useCallback(
    async (projectId?: string) => {
      const projectsResponse = await fetch("/api/projects");
      const projectsPayload = await projectsResponse.json();
      if (!projectsResponse.ok) {
        throw new Error(projectsPayload.error || "刷新项目列表失败。");
      }

      setProjects(projectsPayload.projects);
      const nextProjectId = projectId ?? selectedProjectId ?? projectsPayload.projects[0]?.id;
      if (!nextProjectId) {
        setSelectedBundle(null);
        return;
      }

      setSelectedProjectId(nextProjectId);
      const bundleResponse = await fetch(`/api/projects/${nextProjectId}`);
      const bundlePayload = await bundleResponse.json();
      if (!bundleResponse.ok) {
        throw new Error(bundlePayload.error || "刷新项目详情失败。");
      }
      setSelectedBundle(bundlePayload.bundle);
    },
    [selectedProjectId],
  );

  const updateProjectStaleArtifacts = useCallback((projectId: string, updater: (current: StaleArtifact[]) => StaleArtifact[]) => {
    setStaleArtifactsByProject((currentMap) => {
      const nextItems = updater(currentMap[projectId] ?? []);
      const nextMap = { ...currentMap };
      if (nextItems.length > 0) {
        nextMap[projectId] = nextItems;
      } else {
        delete nextMap[projectId];
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(staleArtifactsStorageKey, JSON.stringify(nextMap));
      }
      return nextMap;
    });
  }, []);

  const markArtifactsStale = useCallback(
    (artifacts: StaleArtifact[], projectId = selectedProjectId) => {
      if (!projectId || artifacts.length === 0) {
        return;
      }
      updateProjectStaleArtifacts(projectId, (current) => Array.from(new Set([...current, ...artifacts])));
    },
    [selectedProjectId, updateProjectStaleArtifacts],
  );

  const clearArtifacts = useCallback(
    (artifacts: StaleArtifact[], projectId = selectedProjectId) => {
      if (!projectId || artifacts.length === 0) {
        return;
      }
      updateProjectStaleArtifacts(projectId, (current) => current.filter((item) => !artifacts.includes(item)));
    },
    [selectedProjectId, updateProjectStaleArtifacts],
  );

  const selectedStaleArtifacts = selectedProjectId ? staleArtifactsByProject[selectedProjectId] ?? [] : [];

  return {
    projects,
    samples,
    selectedProjectId,
    selectedBundle,
    selectedStaleArtifacts,
    sampleDigest,
    selectProject: setSelectedProjectId,
    setSelectedBundle,
    refreshProjectsAndBundle,
    markArtifactsStale,
    clearArtifacts,
  };
}
