import {
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Input,
  Skeleton,
  SkeletonItem,
  Text,
  createTableColumn,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Promx_budgetsService } from '../generated'
import type { Promx_budgetsBase } from '../generated/models/Promx_budgetsModel'

type BudgetRow = {
  id: string
  name: string
  budgetConsumed: string
  ownerId: string
}

type DraftField = 'name' | 'budgetConsumed' | 'ownerId'

type FieldErrors = Record<string, string | undefined>

type FieldSaving = Record<string, boolean>

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '56ch',
  },
  panel: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow16,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
  },
  dataGrid: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  cellInput: {
    width: '100%',
  },
  errorText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteRedForeground1,
    marginTop: tokens.spacingVerticalXS,
  },
  savingText: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteBlueForeground1,
    marginTop: tokens.spacingVerticalXS,
  },
  strongText: {
    fontWeight: tokens.fontWeightSemibold,
  },
  mobileOnly: {
    display: 'none',
    '@media (max-width: 900px)': {
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacingVerticalL,
    },
  },
  desktopOnly: {
    '@media (max-width: 900px)': {
      display: 'none',
    },
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    boxShadow: tokens.shadow8,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  cardLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  cardValue: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground1,
  },
  skeletonRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground2,
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalXL,
  },
})

const defaultRowsToShow = 12

export default function BudgetGrid() {
  const styles = useStyles()
  const [rows, setRows] = useState<BudgetRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, BudgetRow>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState<FieldSaving>({})
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const columnSizingOptions = useMemo(
    () => ({
      name: {
        defaultWidth: 320,
        minWidth: 220,
        idealWidth: 360,
      },
      budgetConsumed: {
        defaultWidth: 180,
        minWidth: 140,
        idealWidth: 200,
      },
      ownerId: {
        defaultWidth: 280,
        minWidth: 200,
        idealWidth: 340,
      },
    }),
    []
  )

  const loadBudgets = useCallback(async () => {
    setLoading(true)
    setLoadError(undefined)
    try {
      const result = await Promx_budgetsService.getAll({
        select: ['promx_budgetid', 'promx_name', 'promx_budgetconsumed', 'ownerid'],
        orderBy: ['promx_name asc'],
        top: 50,
      })
      const data = Array.isArray(result.data) ? result.data : []
      const mapped = data.map((budget) => ({
        id: budget.promx_budgetid,
        name: budget.promx_name ?? '',
        budgetConsumed: budget.promx_budgetconsumed ?? '',
        ownerId: budget.ownerid ?? '',
      }))
      const draftSeed: Record<string, BudgetRow> = {}
      mapped.forEach((item) => {
        draftSeed[item.id] = { ...item }
      })
      setRows(mapped)
      setDrafts(draftSeed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load budgets.'
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBudgets()
  }, [loadBudgets])

  const handleDraftChange = useCallback(
    (id: string, field: DraftField, value: string) => {
      setDrafts((current) => ({
        ...current,
        [id]: {
          ...current[id],
          [field]: value,
        },
      }))
    },
    []
  )

  const handleCommit = useCallback(
    async (id: string, field: DraftField, value: string) => {
      const draftValue = value.trim()
      const original = rows.find((row) => row.id === id)
      if (!original) {
        return
      }

      const errorKey = getErrorKey(id, field)
      const updatePayload: Record<string, unknown> = {}
      let nextValue = draftValue

      if (field === 'budgetConsumed') {
        const parsed = Number(draftValue)
        if (!Number.isFinite(parsed)) {
          setFieldErrors((current) => ({
            ...current,
            [errorKey]: 'Enter a valid number.',
          }))
          return
        }
        updatePayload.promx_budgetconsumed = parsed
        nextValue = String(parsed)
      }

      if (field === 'name') {
        updatePayload.promx_name = draftValue
      }

      if (field === 'ownerId') {
        updatePayload.ownerid = draftValue
      }

      const originalValue = original[field]
      if (originalValue === nextValue) {
        setFieldErrors((current) => ({
          ...current,
          [errorKey]: undefined,
        }))
        return
      }

      setSaving((current) => ({
        ...current,
        [errorKey]: true,
      }))

      try {
        await Promx_budgetsService.update(
          id,
          updatePayload as Partial<Omit<Promx_budgetsBase, 'promx_budgetid'>>
        )
        setRows((current) =>
          current.map((row) =>
            row.id === id
              ? {
                  ...row,
                  [field]: nextValue,
                }
              : row
          )
        )
        setDrafts((current) => ({
          ...current,
          [id]: {
            ...current[id],
            [field]: nextValue,
          },
        }))
        setFieldErrors((current) => ({
          ...current,
          [errorKey]: undefined,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save changes.'
        setFieldErrors((current) => ({
          ...current,
          [errorKey]: message,
        }))
      } finally {
        setSaving((current) => ({
          ...current,
          [errorKey]: false,
        }))
      }
    },
    [rows]
  )

  const columns = useMemo(
    () => [
      createTableColumn<BudgetRow>({
        columnId: 'name',
        compare: () => 0,
        renderHeaderCell: () => 'Budget name',
        renderCell: (item) => (
          <EditableField
            field="name"
            item={item}
            value={getDraftValue(drafts, item.id, 'name')}
            onChange={handleDraftChange}
            onCommit={handleCommit}
            error={fieldErrors[getErrorKey(item.id, 'name')]}
            saving={saving[getErrorKey(item.id, 'name')]}
          />
        ),
      }),
      createTableColumn<BudgetRow>({
        columnId: 'budgetConsumed',
        compare: () => 0,
        renderHeaderCell: () => 'Consumed',
        renderCell: (item) => (
          <EditableField
            field="budgetConsumed"
            item={item}
            value={getDraftValue(drafts, item.id, 'budgetConsumed')}
            onChange={handleDraftChange}
            onCommit={handleCommit}
            error={fieldErrors[getErrorKey(item.id, 'budgetConsumed')]}
            saving={saving[getErrorKey(item.id, 'budgetConsumed')]}
          />
        ),
      }),
      createTableColumn<BudgetRow>({
        columnId: 'ownerId',
        compare: () => 0,
        renderHeaderCell: () => 'Owner ID',
        renderCell: (item) => (
          <EditableField
            field="ownerId"
            item={item}
            value={getDraftValue(drafts, item.id, 'ownerId')}
            onChange={handleDraftChange}
            onCommit={handleCommit}
            error={fieldErrors[getErrorKey(item.id, 'ownerId')]}
            saving={saving[getErrorKey(item.id, 'ownerId')]}
          />
        ),
      }),
    ],
    [drafts, fieldErrors, handleCommit, handleDraftChange, saving]
  )

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <Text as="h2" className={styles.title}>
            Budget overview
          </Text>
          <Text as="p" className={styles.subtitle}>
            Click into any field, update it, and tab or click away to save instantly. Changes
            are written directly to Dataverse.
          </Text>
        </div>
        <Button appearance="secondary" onClick={() => void loadBudgets()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className={styles.panel}>
        {loading ? (
          <BudgetGridSkeleton />
        ) : loadError ? (
          <div className={styles.emptyState}>
            <Text className={styles.strongText}>We could not load budgets.</Text>
            <Text>{loadError}</Text>
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.emptyState}>
            <Text className={styles.strongText}>No budgets available yet.</Text>
            <Text>Add or sync budgets to start editing.</Text>
          </div>
        ) : (
          <>
            <div className={styles.desktopOnly}>
              <DataGrid
                items={rows}
                columns={columns}
                getRowId={(item) => item.id}
                resizableColumns
                columnSizingOptions={columnSizingOptions}
                className={styles.dataGrid}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<BudgetRow>>
                  {({ item, rowId }) => (
                    <DataGridRow key={rowId}>
                      {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>

            <div className={styles.mobileOnly}>
              {rows.map((row) => (
                <div className={styles.card} key={row.id}>
                  <div>
                    <Text className={styles.cardLabel}>Budget name</Text>
                    <EditableField
                      field="name"
                      item={row}
                      value={getDraftValue(drafts, row.id, 'name')}
                      onChange={handleDraftChange}
                      onCommit={handleCommit}
                      error={fieldErrors[getErrorKey(row.id, 'name')]}
                      saving={saving[getErrorKey(row.id, 'name')]}
                    />
                  </div>
                  <div>
                    <Text className={styles.cardLabel}>Consumed</Text>
                    <EditableField
                      field="budgetConsumed"
                      item={row}
                      value={getDraftValue(drafts, row.id, 'budgetConsumed')}
                      onChange={handleDraftChange}
                      onCommit={handleCommit}
                      error={fieldErrors[getErrorKey(row.id, 'budgetConsumed')]}
                      saving={saving[getErrorKey(row.id, 'budgetConsumed')]}
                    />
                  </div>
                  <div>
                    <Text className={styles.cardLabel}>Owner ID</Text>
                    <EditableField
                      field="ownerId"
                      item={row}
                      value={getDraftValue(drafts, row.id, 'ownerId')}
                      onChange={handleDraftChange}
                      onCommit={handleCommit}
                      error={fieldErrors[getErrorKey(row.id, 'ownerId')]}
                      saving={saving[getErrorKey(row.id, 'ownerId')]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

type EditableFieldProps = {
  field: DraftField
  item: BudgetRow
  value: string
  onChange: (id: string, field: DraftField, value: string) => void
  onCommit: (id: string, field: DraftField, value: string) => void
  error?: string
  saving?: boolean
}

function EditableField({ field, item, value, onChange, onCommit, error, saving }: EditableFieldProps) {
  const styles = useStyles()

  return (
    <div>
      <Input
        aria-label={getFieldLabel(field)}
        value={value}
        className={styles.cellInput}
        onChange={(_, data) => onChange(item.id, field, data.value)}
        onBlur={() => void onCommit(item.id, field, value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            ;(event.target as HTMLInputElement).blur()
          }
        }}
      />
      {saving ? <Text className={styles.savingText}>Saving...</Text> : null}
      {error ? <Text className={styles.errorText}>{error}</Text> : null}
    </div>
  )
}

function BudgetGridSkeleton() {
  const styles = useStyles()

  return (
    <Skeleton aria-label="Loading budgets">
      <div className={styles.desktopOnly}>
        {Array.from({ length: defaultRowsToShow }).map((_, index) => (
          <div className={styles.skeletonRow} key={`skeleton-${index}`}>
            <SkeletonItem size={24} />
            <SkeletonItem size={24} />
            <SkeletonItem size={24} />
          </div>
        ))}
      </div>
      <div className={styles.mobileOnly}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div className={styles.card} key={`card-skeleton-${index}`}>
            <SkeletonItem size={20} />
            <SkeletonItem size={28} />
            <SkeletonItem size={20} />
            <SkeletonItem size={28} />
          </div>
        ))}
      </div>
    </Skeleton>
  )
}

function getDraftValue(
  drafts: Record<string, BudgetRow>,
  id: string,
  field: DraftField
): string {
  return drafts[id]?.[field] ?? ''
}

function getErrorKey(id: string, field: DraftField) {
  return `${id}-${field}`
}

function getFieldLabel(field: DraftField) {
  if (field === 'budgetConsumed') {
    return 'Budget consumed'
  }

  if (field === 'ownerId') {
    return 'Owner ID'
  }

  return 'Budget name'
}
