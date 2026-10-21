import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '@/components/ui/sonner';
import { useApiClient } from '@/hooks/use-api-client';
import { getUserMessage, isApiError } from '@/lib/api';

import { downloadBlob } from '../lib/download';
import { streamExport } from '../lib/export-data';
import {
  type ExportAccount,
  exportFileName,
  type ExportFormat,
  type ExportMeta,
  type ExportThread,
  isFileFormat,
  WRITERS,
} from '../lib/export-format';

export type ExportState =
  | { status: 'idle' }
  | { status: 'running'; format: ExportFormat; phase: 'listing' | 'reading'; done: number; total: number }
  | {
      status: 'done';
      format: ExportFormat;
      fileName: string | null;
      threads: number;
      turns: number;
      truncated: boolean;
    }
  | { status: 'error'; format: ExportFormat; message: string; requestId: string | null }
  | { status: 'cancelled' };

/** What the print view (PDF) shows: the same content as the files. */
export interface PrintJob {
  meta: ExportMeta;
  entries: ExportThread[];
}

export interface UseExportResult {
  state: ExportState;
  start: (format: ExportFormat) => void;
  cancel: () => void;
  /** The print view while a PDF export is open; null otherwise. */
  printJob: PrintJob | null;
  closePrint: () => void;
}

/**
 * Runs one export at a time: reads every thread (with progress), writes the file one thread at a
 * time into Blob parts (so the page never holds the whole file as one string), and downloads it.
 * PDF collects the threads for the print view instead. Cancelling stops the requests in flight.
 */
export function useExport(account: ExportAccount): UseExportResult {
  const api = useApiClient();
  const [state, setState] = useState<ExportState>({ status: 'idle' });
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Leaving the page stops an export in flight.
  useEffect(() => {
    const controllers = controllerRef;
    return () => controllers.current?.abort();
  }, []);

  const start = useCallback(
    (format: ExportFormat) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setPrintJob(null);
      setState({ status: 'running', format, phase: 'listing', done: 0, total: 0 });

      const exportedAt = new Date();
      const parts: BlobPart[] = [];
      const entries: ExportThread[] = [];
      // Filled in by the callbacks below (a box, so TypeScript does not narrow it to null).
      const collected: { meta: ExportMeta | null; turns: number } = { meta: null, turns: 0 };

      const run = async () => {
        try {
          const listing = await streamExport(api, {
            signal: controller.signal,
            onList: ({ threads, truncated }) => {
              const meta: ExportMeta = { exportedAt, account, threads, truncated };
              collected.meta = meta;
              if (isFileFormat(format)) parts.push(WRITERS[format].start(meta));
            },
            onProgress: (done, total) => {
              if (controller.signal.aborted) return;
              setState({ status: 'running', format, phase: 'reading', done, total });
            },
            onThread: (entry, index) => {
              collected.turns += entry.messages.length;
              const { meta } = collected;
              if (!meta) return;
              if (isFileFormat(format)) {
                // A Blob per thread lets the browser keep the text out of the JavaScript heap.
                parts.push(new Blob([WRITERS[format].thread(entry, index, meta)]));
              } else {
                entries.push(entry);
              }
            },
          });
          const finalMeta = collected.meta;
          if (controller.signal.aborted) {
            // Cancelled just as the last thread arrived: still a cancel, nothing is saved.
            if (controllerRef.current === controller) setState({ status: 'cancelled' });
            return;
          }
          if (!finalMeta) return;
          const { turns } = collected;
          let fileName: string | null = null;
          if (isFileFormat(format)) {
            const writer = WRITERS[format];
            parts.push(writer.end(finalMeta));
            fileName = exportFileName(format, exportedAt);
            downloadBlob(new Blob(parts, { type: writer.mime }), fileName);
            toast.success(`Downloaded ${fileName}`, {
              description: `${listing.threads.length} ${listing.threads.length === 1 ? 'thread' : 'threads'}, ${turns} ${turns === 1 ? 'turn' : 'turns'}.`,
            });
          } else {
            setPrintJob({ meta: finalMeta, entries });
          }
          setState({
            status: 'done',
            format,
            fileName,
            threads: listing.threads.length,
            turns,
            truncated: listing.truncated,
          });
        } catch (error) {
          if (controller.signal.aborted && controllerRef.current !== controller) return;
          if (controller.signal.aborted) {
            setState({ status: 'cancelled' });
            return;
          }
          setState({
            status: 'error',
            format,
            message: getUserMessage(error),
            requestId: isApiError(error) ? (error.requestId ?? null) : null,
          });
        } finally {
          if (controllerRef.current === controller) controllerRef.current = null;
        }
      };
      void run();
    },
    [api, account],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const closePrint = useCallback(() => setPrintJob(null), []);

  return { state, start, cancel, printJob, closePrint };
}
