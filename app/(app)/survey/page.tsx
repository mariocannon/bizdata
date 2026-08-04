import * as React from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { AlertTriangle, Database, Info } from 'lucide-react'
import {
  AGE_RANGES,
  AREAS,
  CHILDREN_AGES,
  CHILDREN_AT_HOME,
  EDUCATION,
  GENDERS,
  HOME_OWNERSHIP,
  HOME_VALUES,
  HOUSEHOLD_INCOMES,
  INVESTMENTS,
  PETS,
  RELATIONSHIP_STATUSES,
  TOPICS,
  distribution,
  loadSurveyResponses,
  multiDistribution,
  occupations,
  responsesByDay,
  type Distribution,
} from '@/lib/survey'
import { formatPercent } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { DistributionChart, ResponsesByDayChart } from '@/components/survey/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

/**
 * Reader survey.
 *
 * Rendered fresh on every request — `force-dynamic` plus `noStore()` plus a
 * no-store fetch inside the Supabase client. A refresh re-queries the survey
 * database; nothing here is ever served from a cache.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TIME_ZONE = 'Pacific/Auckland'

const stampFormatter = new Intl.DateTimeFormat('en-NZ', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** Below this, one extra response swings a share by several points. */
const SMALL_SAMPLE = 30

/**
 * A chart in a card. The footnote is not decoration: every question after
 * "where do you live" is optional, so a chart's real denominator is the number
 * of people who answered *that* question, not the number of responses.
 */
function ChartCard({
  title,
  note,
  data,
  className,
  labelWidth,
}: {
  title: string
  note?: string
  data: Distribution
  className?: string
  labelWidth?: number
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {data.answered} answered
          {data.skipped > 0 ? ` · ${data.skipped} skipped` : ''}
          {note ? ` · ${note}` : ''}
        </p>
      </CardHeader>
      <CardContent>
        {/* An ordered scale keeps its empty buckets, but when *nobody* answered
            the question that becomes a ladder of "0 · 0%" rows that says
            nothing. Say it in words instead. */}
        {data.answered === 0 ? (
          <EmptyState title="Nobody has answered this yet" className="py-8" />
        ) : (
          <DistributionChart data={data.points} labelWidth={labelWidth} />
        )}
      </CardContent>
    </Card>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  )
}

function Notice({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-5">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 text-sm">
          <p className="font-medium text-foreground">{title}</p>
          <div className="mt-1 space-y-2 text-muted-foreground">{children}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function SurveyPage() {
  noStore()

  const load = await loadSurveyResponses()
  const refreshedAt = stampFormatter.format(new Date())

  if (load.status === 'unconfigured') {
    return (
      <>
        <PageHeader
          title="Reader survey"
          description="What readers tell us they want from The Tide"
        />
        <Notice icon={Database} title="Survey database is not connected">
          <p>
            The survey lives in its own Supabase project, separate from the ad
            manager&apos;s database. Set these two variables and reload:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code className="text-xs">SURVEY_SUPABASE_URL</code> — the survey
              project&apos;s API URL
            </li>
            <li>
              <code className="text-xs">SURVEY_SUPABASE_SERVICE_ROLE_KEY</code> — its
              service-role key
            </li>
          </ul>
          <p>
            The service-role key is needed because <code className="text-xs">survey_responses</code>{' '}
            allows anonymous inserts but no reads, so the anon key returns nothing. It is
            only ever used on the server.
          </p>
        </Notice>
      </>
    )
  }

  if (load.status === 'error') {
    return (
      <>
        <PageHeader
          title="Reader survey"
          description="What readers tell us they want from The Tide"
        />
        <Notice icon={AlertTriangle} title="Couldn't read the survey database">
          <p className="font-mono text-xs">{load.message}</p>
          <p>
            Check <code className="text-xs">SURVEY_SUPABASE_URL</code> and{' '}
            <code className="text-xs">SURVEY_SUPABASE_SERVICE_ROLE_KEY</code>. A
            row-level-security error usually means the anon key was used instead of the
            service-role key.
          </p>
        </Notice>
      </>
    )
  }

  const { rows } = load
  const total = rows.length

  if (total === 0) {
    return (
      <>
        <PageHeader
          title="Reader survey"
          description="What readers tell us they want from The Tide"
        />
        <EmptyState
          title="No survey responses yet"
          description="Charts appear here as soon as the first reader completes the survey."
        />
      </>
    )
  }

  // --- Distributions ------------------------------------------------------
  // Ordered scales keep the survey's own order and show empty buckets, because
  // a gap in an income or age scale is a finding. Unordered lists rank by size
  // and drop the options nobody picked.
  const topics = multiDistribution(rows, (row) => row.topics, TOPICS, {
    includeEmpty: true,
  })
  const areas = distribution(rows, (row) => row.area, AREAS)
  const ages = distribution(rows, (row) => row.ageRange, AGE_RANGES, {
    order: 'canonical',
    includeEmpty: true,
  })
  const genders = distribution(rows, (row) => row.gender, GENDERS)
  const education = distribution(rows, (row) => row.education, EDUCATION, {
    order: 'canonical',
    includeEmpty: true,
  })
  const relationships = distribution(
    rows,
    (row) => row.relationshipStatus,
    RELATIONSHIP_STATUSES
  )
  const childrenAtHome = distribution(
    rows,
    (row) => row.childrenAtHome,
    CHILDREN_AT_HOME
  )
  const childrenAges = multiDistribution(rows, (row) => row.childrenAges, CHILDREN_AGES)
  const pets = multiDistribution(rows, (row) => row.pets, PETS)
  const incomes = distribution(rows, (row) => row.householdIncome, HOUSEHOLD_INCOMES, {
    order: 'canonical',
    includeEmpty: true,
  })
  const homeOwnership = distribution(rows, (row) => row.homeOwnership, HOME_OWNERSHIP)
  const homeValues = distribution(rows, (row) => row.homeValue, HOME_VALUES, {
    order: 'canonical',
    includeEmpty: true,
  })
  const investments = distribution(rows, (row) => row.investments, INVESTMENTS, {
    order: 'canonical',
    includeEmpty: true,
  })

  const byDay = responsesByDay(rows)
  const jobs = occupations(rows)

  // --- Headline numbers ---------------------------------------------------
  const topTopic = topics.points.filter((point) => point.count > 0)[0]

  const distinctAreas = new Set(
    rows.map((row) => row.area).filter((area): area is string => Boolean(area))
  ).size

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const lastWeek = rows.filter((row) => new Date(row.createdAt).getTime() >= weekAgo).length

  // Counted off the rows, not off the chart: a "Yes" nobody has picked yet is
  // dropped from the ranked points, and reading it back from there would show
  // an em dash where the honest answer is 0%.
  const kidsAnswered = rows.filter((row) => Boolean(row.childrenAtHome)).length
  const kidsYes = rows.filter((row) => row.childrenAtHome === 'Yes').length

  const contactable = rows.filter((row) => row.hasEmail).length

  return (
    <>
      <PageHeader
        title="Reader survey"
        description={`What readers tell us they want from The Tide · ${total} ${
          total === 1 ? 'response' : 'responses'
        } · refreshed ${refreshedAt}`}
      />

      {total < SMALL_SAMPLE ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Only {total} {total === 1 ? 'response' : 'responses'} so far, so the
            percentages move a lot with each new one. Read the counts rather than the
            shares until the sample is bigger.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Responses"
          value={String(total)}
          sublabel={byDay.length > 1 ? `over ${byDay.length} days` : 'first day'}
        />
        <KpiCard label="Last 7 days" value={String(lastWeek)} sublabel="new responses" />
        <KpiCard
          label="Top topic"
          value={topTopic ? String(topTopic.count) : '—'}
          sublabel={
            topTopic
              ? `${topTopic.label} · ${formatPercent(topTopic.share)}`
              : 'No topics picked yet'
          }
          tone="positive"
        />
        <KpiCard
          label="Suburbs"
          value={String(distinctAreas)}
          sublabel={`of ${AREAS.length - 1} on the coast`}
        />
        <KpiCard
          label="Kids at home"
          value={kidsAnswered > 0 ? formatPercent(kidsYes / kidsAnswered) : '—'}
          sublabel={
            kidsAnswered > 0 ? `of ${kidsAnswered} who answered` : 'Nobody answered yet'
          }
        />
        <KpiCard
          label="Left an email"
          value={String(contactable)}
          sublabel={total > 0 ? `${formatPercent(contactable / total)} of responses` : ''}
        />
      </section>

      <SectionHeading>What readers want</SectionHeading>
      <section className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Topics readers want covered"
          note="readers could pick several, so shares add to over 100%"
          data={topics}
          className="lg:col-span-2"
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Responses per day</CardTitle>
            <p className="text-xs text-muted-foreground">
              {total} in total · NZ time
            </p>
          </CardHeader>
          <CardContent>
            <ResponsesByDayChart data={byDay} />
          </CardContent>
        </Card>
      </section>

      <SectionHeading>Where they are</SectionHeading>
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Suburb" data={areas} />
        <ChartCard title="Home ownership" data={homeOwnership} />
      </section>

      <SectionHeading>Who they are</SectionHeading>
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Age" data={ages} />
        <ChartCard title="Education" data={education} />
        <ChartCard title="Gender" data={genders} />
        <ChartCard title="Relationship status" data={relationships} />
        <ChartCard title="Children at home" data={childrenAtHome} />
        <ChartCard
          title="Ages of children at home"
          note="several per household"
          data={childrenAges}
        />
        <ChartCard title="Pets" note="several per household" data={pets} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Occupations</CardTitle>
            <p className="text-xs text-muted-foreground">
              {jobs.reduce((sum, job) => sum + job.count, 0)} answered · free text, so
              it&apos;s a list rather than a chart
            </p>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState title="No occupations given yet" className="py-8" />
            ) : (
              <ul className="flex flex-col gap-1">
                {jobs.slice(0, 12).map((job) => (
                  <li
                    key={job.label.toLowerCase()}
                    className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 text-sm last:border-0"
                  >
                    <span className="min-w-0 truncate" title={job.label}>
                      {job.label}
                    </span>
                    <span className="tabular shrink-0 text-muted-foreground">
                      {job.count}
                    </span>
                  </li>
                ))}
                {jobs.length > 12 ? (
                  <li className="pt-1 text-xs text-muted-foreground">
                    + {jobs.length - 12} more
                  </li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <SectionHeading>Household and means</SectionHeading>
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Household income" data={incomes} />
        <ChartCard title="Home value" data={homeValues} />
        <ChartCard title="Investable assets" data={investments} className="lg:col-span-2" />
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Shares are of the people who answered each question — everything except suburb
        and topics is optional, so denominators differ between charts. Grey bars are
        &ldquo;prefer not to say&rdquo;.
      </p>
    </>
  )
}
