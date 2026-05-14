'use client';

import { Tabs, TabList, Tab, TabPanels, TabPanel, TextField } from '@via-ds/components';

interface Props {
  figmaUrl: string;
  onFigmaUrlChange: (v: string) => void;
  githubUrl: string;
  onGithubUrlChange: (v: string) => void;
  uploadedFiles: File[];
  onFilesChange: (files: File[]) => void;
}

export default function ArtifactInput({
  figmaUrl,
  onFigmaUrlChange,
  githubUrl,
  onGithubUrlChange,
  uploadedFiles,
  onFilesChange,
}: Props) {
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    onFilesChange([...uploadedFiles, ...incoming]);
  }

  function removeFile(name: string) {
    onFilesChange(uploadedFiles.filter((f) => f.name !== name));
  }

  return (
    <section className="p-6 border-b border-gray-200">
      <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-3">
        Artifact to review
      </p>
      <Tabs defaultSelectedKey="url">
        <TabList aria-label="Input type">
          <Tab key="url">URL</Tab>
          <Tab key="upload">Upload</Tab>
          <Tab key="both">Both</Tab>
        </TabList>
        <TabPanels>
          <TabPanel key="url">
            <div className="flex flex-col gap-3 pt-3">
              <TextField
                label="Figma prototype URL"
                placeholder="https://www.figma.com/proto/..."
                value={figmaUrl}
                onChange={onFigmaUrlChange}
              />
              <TextField
                label="GitHub Pages / Vercel / Netlify URL"
                placeholder="https://your-preview.vercel.app"
                value={githubUrl}
                onChange={onGithubUrlChange}
              />
            </div>
          </TabPanel>
          <TabPanel key="upload">
            <div className="pt-3">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                <span className="text-2xl text-gray-400 mb-2">↑</span>
                <span className="text-sm text-gray-500">Drop screenshots here</span>
                <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP · Multiple files OK</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
              <FileChips files={uploadedFiles} onRemove={removeFile} />
            </div>
          </TabPanel>
          <TabPanel key="both">
            <div className="flex flex-col gap-3 pt-3">
              <TextField
                label="Figma prototype URL"
                placeholder="https://www.figma.com/proto/..."
                value={figmaUrl}
                onChange={onFigmaUrlChange}
              />
              <TextField
                label="GitHub Pages / preview URL"
                placeholder="https://your-preview.vercel.app"
                value={githubUrl}
                onChange={onGithubUrlChange}
              />
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                <span className="text-sm text-gray-500">+ Screenshots (optional)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
              <FileChips files={uploadedFiles} onRemove={removeFile} />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </section>
  );
}

function FileChips({ files, onRemove }: { files: File[]; onRemove: (name: string) => void }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {files.map((f) => (
        <span
          key={f.name}
          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600"
        >
          {f.name}
          <button
            onClick={() => onRemove(f.name)}
            className="ml-1 text-gray-400 hover:text-red-500"
            aria-label={`Remove ${f.name}`}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
