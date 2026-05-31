import { AlertTriangle, Shield, X, XCircle } from 'lucide-react';
import { useState, type Ref } from 'react';

import { ProductStatusBadge } from '../../features/products/ProductStatusBadge';
import { formatDate } from '../../lib/format';
import { PRODUCT_STATUS } from '../../types/product';
import {
  REPORT_RESOLUTION_TYPE,
  REPORT_STATUS,
  type ProductReport,
  type ReportResolutionType,
  type ReportType,
  type StoreReport,
} from '../../types/report';

import { DisableProductModal } from './DisableProductModal';
import { DisableStoreModal } from './DisableStoreModal';
import { DismissReportModal } from './DismissReportModal';
import { WarnSellerModal } from './WarnSellerModal';
import { useToast } from '../../hooks/useToast';
import {
  disableReportedProduct,
  disableReportedStore,
  dismissReport,
  warnSellerFromReport,
} from './reportsApi';

function ReportStatusBadge({ status }: { status: ProductReport['status'] }) {
  if (status === REPORT_STATUS.PENDING) {
    return (
      <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
        Pendiente
      </span>
    );
  }
  if (status === REPORT_STATUS.DISMISSED) {
    return (
      <span className="inline-flex rounded-full bg-[var(--text-muted)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
        Desestimado
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
      Resuelto
    </span>
  );
}

function ResolutionTypeBadge({ resolutionType }: { resolutionType: ReportResolutionType }) {
  if (resolutionType === REPORT_RESOLUTION_TYPE.DISABLED) {
    return (
      <span className="inline-flex rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-semibold text-danger">
        Inhabilitado
      </span>
    );
  }
  if (resolutionType === REPORT_RESOLUTION_TYPE.WARNED) {
    return (
      <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
        Advertencia enviada
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[var(--text-muted)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
      Desestimado
    </span>
  );
}

function isProductReport(reportType: ReportType): reportType is 'PRODUCT' {
  return reportType === 'PRODUCT';
}

export type ReportDetailPanelProps = {
  reportId: string | null;
  reportType: ReportType;
  report: ProductReport | StoreReport | null;
  panelRef?: Ref<HTMLElement>;
  onClose: () => void;
  onReportChange: (updated: ProductReport | StoreReport) => void;
};

export function ReportDetailPanel({
  reportId,
  reportType,
  report,
  panelRef,
  onClose,
  onReportChange,
}: ReportDetailPanelProps) {
  const [disableProductOpen, setDisableProductOpen] = useState(false);
  const [disableStoreOpen, setDisableStoreOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const { success } = useToast();

  if (!reportId || !report) {
    return null;
  }

  const isResolved = report.status === REPORT_STATUS.RESOLVED;
  const canAct =
    report.status === REPORT_STATUS.PENDING || report.status === REPORT_STATUS.DISMISSED;
  const canDismiss = report.status === REPORT_STATUS.PENDING;

  const productReport = isProductReport(reportType) ? (report as ProductReport) : null;
  const storeReport = !isProductReport(reportType) ? (report as StoreReport) : null;

  const elementDisabled =
    productReport != null
      ? productReport.product.currentStatus === PRODUCT_STATUS.DISABLED_BY_ADMIN
      : storeReport != null
        ? !storeReport.store.isActive
        : false;

  const showDisableProductButton =
    canAct && productReport != null && !elementDisabled;
  const showDisableStoreButton = canAct && storeReport != null && !elementDisabled;
  const showWarnButton = canAct && !elementDisabled;

  const entityName =
    productReport?.product.name ?? storeReport?.store.businessName ?? '';

  return (
    <>
      <section
        ref={panelRef}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
        aria-label="Detalle del reporte"
      >
        <div className="relative border-b border-[var(--border)] p-6 pb-4">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="Cerrar detalle"
          >
            <X className="size-5" />
          </button>

          <ReportStatusBadge status={report.status} />
          <p className="mt-2 text-sm text-[var(--text-muted)]">{formatDate(report.createdAt)}</p>
        </div>

        <section className="space-y-2 px-6 py-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Motivo del reporte</h3>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{report.reason}</p>
        </section>

        <section className="space-y-2 border-t border-[var(--border)] px-6 py-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Reportado por</h3>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {report.reporter.displayName?.trim() || (
              <span className="text-[var(--text-muted)]">Sin nombre</span>
            )}
          </p>
          <p className="text-sm text-[var(--text-muted)]">{report.reporter.email}</p>
        </section>

        <section className="space-y-2 border-t border-[var(--border)] px-6 py-6">
          {productReport ? (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Producto reportado</h3>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {productReport.product.name}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {productReport.product.store.businessName}
              </p>
              <div className="pt-1">
                <ProductStatusBadge status={productReport.product.currentStatus} />
              </div>
              {productReport.product.currentStatus === PRODUCT_STATUS.DISABLED_BY_ADMIN ? (
                <p className="text-sm text-success">Este producto ya fue inhabilitado</p>
              ) : null}
              {isResolved && report.resolutionType ? (
                <div className="pt-2">
                  <ResolutionTypeBadge resolutionType={report.resolutionType} />
                </div>
              ) : null}
            </>
          ) : storeReport ? (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tienda reportada</h3>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {storeReport.store.businessName}
              </p>
              {!storeReport.store.isActive ? (
                <p className="text-sm text-success">Esta tienda ya fue desactivada</p>
              ) : null}
              {isResolved && report.resolutionType ? (
                <div className="pt-2">
                  <ResolutionTypeBadge resolutionType={report.resolutionType} />
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <div className="border-t border-[var(--border)] p-6">
          {isResolved ? (
            <p className="text-center text-sm text-[var(--text-muted)]">
              Este reporte fue resuelto. No hay acciones disponibles.
            </p>
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-col gap-3">
              {showDisableProductButton ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90"
                  onClick={() => setDisableProductOpen(true)}
                >
                  <Shield className="size-4" aria-hidden />
                  Inhabilitar producto
                </button>
              ) : null}

              {showDisableStoreButton ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90"
                  onClick={() => setDisableStoreOpen(true)}
                >
                  <Shield className="size-4" aria-hidden />
                  Desactivar tienda
                </button>
              ) : null}

              {showWarnButton ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                  onClick={() => setWarnOpen(true)}
                >
                  <AlertTriangle className="size-4" aria-hidden />
                  Enviar advertencia
                </button>
              ) : null}

              {canDismiss ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-transparent px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                  onClick={() => setDismissOpen(true)}
                >
                  <XCircle className="size-4" aria-hidden />
                  Desestimar reporte
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {productReport && disableProductOpen ? (
        <DisableProductModal
          open={disableProductOpen}
          product={productReport.product}
          onClose={() => setDisableProductOpen(false)}
          onDisable={async (productId, data) => {
            const updated = await disableReportedProduct(reportId, productId, data);
            onReportChange(updated);
            success('Producto inhabilitado y reporte resuelto');
          }}
          onSuccess={() => setDisableProductOpen(false)}
        />
      ) : null}

      {storeReport && disableStoreOpen ? (
        <DisableStoreModal
          open={disableStoreOpen}
          store={storeReport.store}
          onClose={() => setDisableStoreOpen(false)}
          onDisable={async (storeId, data) => {
            const updated = await disableReportedStore(reportId, storeId, data);
            onReportChange(updated);
            success('Tienda desactivada y reporte resuelto');
          }}
          onSuccess={() => setDisableStoreOpen(false)}
        />
      ) : null}

      {warnOpen ? (
        <WarnSellerModal
          open={warnOpen}
          reportType={reportType}
          entityName={entityName}
          onClose={() => setWarnOpen(false)}
          onWarn={async (message) => {
            const updated = await warnSellerFromReport(reportId, { message });
            onReportChange(updated);
            success('Advertencia enviada al vendedor');
          }}
          onSuccess={() => setWarnOpen(false)}
        />
      ) : null}

      {dismissOpen ? (
        <DismissReportModal
          open={dismissOpen}
          reportType={reportType}
          onClose={() => setDismissOpen(false)}
          onDismiss={async (reason) => {
            const updated = await dismissReport(reportId, { reason });
            onReportChange(updated);
            success('Reporte desestimado');
          }}
          onSuccess={() => setDismissOpen(false)}
        />
      ) : null}
    </>
  );
}
