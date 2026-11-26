import { CameraProvider } from '@/components/camera/state';

/** Camera analysis and Camera setup share one state, so a zone drawn in setup shows up in the analysis. */
export default function CameraLayout({ children }: LayoutProps<'/camera'>) {
  return <CameraProvider>{children}</CameraProvider>;
}
