import { dataContent } from '../content';
import { LegalPage } from './legal-page';

/** /data/: the data license, in the same plain long-form layout as the legal pages. */
export function DataPage() {
  return <LegalPage page={dataContent} />;
}
