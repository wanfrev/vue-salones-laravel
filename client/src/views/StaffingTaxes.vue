<template>
  <FeatureGate :gate="{ capability: 'staffing.reports' }">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <DocumentIcon class="h-4 w-4 shrink-0 text-primary" />
        <h1 class="truncate text-xl font-bold tracking-tight text-text sm:text-2xl">{{ t('taxes.title') }}</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button"
          class="rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-text-inverse shadow-sm shadow-primary/20 transition-theme hover:bg-primary-hover"
          @click="openAddInfo">
          {{ t('taxes.addInfo') }}
        </button>
        <button type="button"
          class="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-text transition-theme hover:bg-bg-secondary"
          @click="showEntities = !showEntities">
          {{ showEntities ? t('taxes.hideEntities') : t('taxes.manageEntities') }}
        </button>
        <div class="flex items-center gap-1">
          <button type="button" :title="t('common.prevYear')" :aria-label="t('common.prevYear')"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="year -= 1">
            <ArrowLeftIcon class="h-4 w-4" />
          </button>
          <span class="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-text">{{ year }}</span>
          <button type="button" :title="t('common.nextYear')" :aria-label="t('common.nextYear')"
            class="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary"
            @click="year += 1">
            <ArrowRightIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>

    <div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div v-if="showEntities" class="border-b border-border-subtle px-3 py-3 sm:px-4">
        <p class="mb-1 text-sm font-semibold text-text">{{ t('taxes.entities.title') }}</p>
        <p class="mb-3 text-xs text-text-muted">
          {{ t('taxes.entities.intro') }}
        </p>

        <div v-if="entitiesCtx.entities.value.length" class="mb-3 flex flex-wrap gap-2">
          <span v-for="entity in entitiesCtx.entities.value" :key="entity.id"
            class="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs font-medium text-text">
            {{ entity.name }}
            <button type="button" :title="t('common.delete')" :aria-label="t('common.delete')" class="text-text-muted hover:text-danger" @click="removeEntity(entity.id)">
              <CloseCircleIcon class="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        <p v-else class="mb-3 text-xs text-text-muted">{{ t('taxes.entities.none') }}</p>

        <form class="flex flex-wrap items-end gap-2" @submit.prevent="submitNewEntity">
          <div class="min-w-[200px] flex-1">
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wider text-text-muted" for="new-entity-name">{{ t('taxes.col.name') }}</label>
            <input id="new-entity-name" v-model="newEntityName" type="text" required :placeholder="t('taxes.entities.placeholder')"
              class="w-full rounded-xl border border-border bg-bg-secondary/40 px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15" />
          </div>
          <button type="submit" :disabled="entitiesCtx.isSaving.value"
            class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            {{ t('taxes.entities.add') }}
          </button>
        </form>
      </div>

      <div v-if="report.isLoading.value" class="divide-y divide-border-subtle" aria-busy="true">
        <p class="sr-only">{{ t('taxes.loading') }}</p>
        <div v-for="n in 4" :key="n" class="flex items-center gap-4 px-3 py-3.5 sm:px-4">
          <span class="h-3 w-32 animate-pulse rounded bg-bg-secondary" />
          <span class="h-3 flex-1 animate-pulse rounded bg-bg-secondary" />
          <span class="h-3 w-20 animate-pulse rounded bg-bg-secondary" />
        </div>
      </div>

      <div v-else-if="report.employees.value.length === 0" class="flex flex-col items-center justify-center px-4 py-14 text-center">
        <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-secondary">
          <DocumentIcon class="h-7 w-7 text-text-muted" />
        </div>
        <p class="max-w-md text-sm text-text-muted">
          {{ t('taxes.empty', { year }) }}
        </p>
      </div>

      <div v-else class="scroll-thin overflow-x-auto overflow-y-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border-subtle bg-bg-secondary/30 text-left text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <th class="sticky left-0 z-10 bg-bg-secondary px-3 py-2.5">{{ t('taxes.col.name') }}</th>
              <th class="px-3 py-2.5">{{ t('taxes.col.status') }}</th>
              <th class="px-3 py-2.5">{{ t('taxes.col.company') }}</th>
              <th class="px-3 py-2.5">{{ t('taxes.col.phone') }}</th>
              <th class="px-3 py-2.5">{{ t('taxes.col.address') }}</th>
              <th class="px-3 py-2.5">SSN</th>
              <th class="px-3 py-2.5">{{ t('taxes.col.file') }}</th>
              <th class="px-3 py-2.5">{{ t('taxes.col.date') }}</th>
              <th v-for="entity in report.entities.value" :key="entity.id" class="px-3 py-2.5 text-right">
                {{ entity.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            <tr v-for="employee in visibleEmployees" :key="employee.employeeId" class="hover:bg-bg-secondary/30 transition-theme group">
              <td class="sticky left-0 z-10 whitespace-nowrap bg-surface group-hover:bg-bg-secondary/30 transition-theme px-3 py-2.5 font-medium text-text">
                {{ employee.name }}
              </td>
              <td class="px-3 py-2.5">
                <select :value="employee.status"
                  @change="updateStatus(employee, $event)"
                  class="rounded-md px-2 py-1 text-[10px] font-semibold outline-none cursor-pointer appearance-none text-center min-w-[120px]"
                  :class="statusColors[employee.status]">
                  <option value="BLANK">{{ t('taxes.status.BLANK') }}</option>
                  <option value="SENT_TO_EMPLOYEE">{{ t('taxes.status.SENT_TO_EMPLOYEE') }}</option>
                  <option value="SENT_TO_ACCOUNTANT">{{ t('taxes.status.SENT_TO_ACCOUNTANT') }}</option>
                  <option value="PENDING_TO_SEND">{{ t('taxes.status.PENDING_TO_SEND') }}</option>
                </select>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme" :title="t('common.edit')" @click="openEditProfile(employee)">
                <span v-if="employee.companyName" class="text-xs font-semibold text-primary">
                  {{ employee.companyName }}
                </span>
                <span v-else>—</span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme" :title="t('common.edit')" @click="openEditProfile(employee)">
                {{ employee.phone || '—' }}
              </td>
              <td class="px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme max-w-[200px] truncate" :title="t('common.edit')" @click="openEditProfile(employee)">
                {{ employee.address || '—' }}
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary cursor-pointer hover:bg-bg-secondary transition-theme" :title="t('common.edit')" @click="openEditProfile(employee)">
                {{ employee.ssnLast4 ? `•••-••-${employee.ssnLast4}` : '—' }}
              </td>
              
              <td class="whitespace-nowrap px-3 py-2.5 text-center">
                <button type="button" @click="openGlobalFileModal(employee)" class="text-text-muted hover:text-primary transition-theme inline-flex items-center gap-1 p-1 rounded hover:bg-bg-secondary">
                  <PaperclipIcon v-if="employee.globalFilePath" class="h-4 w-4 text-primary" />
                  <span v-else class="text-[10px] font-medium uppercase">{{ t('taxes.upload') }}</span>
                </button>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-text-secondary text-xs">
                {{ employee.globalFileDate || '—' }}
              </td>

              <td v-for="entity in report.entities.value" :key="entity.id" class="px-3 py-2.5 text-right">
                <button type="button"
                  class="inline-flex items-center gap-1 rounded-lg px-2 py-1 tabular-nums text-text-secondary transition-theme hover:bg-bg-secondary hover:text-primary"
                  @click="openCellModal(employee, entity)">
                  {{ formatUSD(employee.entriesByEntity[entity.id]?.amount ?? 0) }}
                  <PaperclipIcon v-if="employee.entriesByEntity[entity.id]?.hasFile" class="h-3.5 w-3.5 text-primary" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button v-if="report.employees.value.length > visibleEmployees.length" type="button"
        class="w-full border-t border-border-subtle py-3 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
        @click="rowsShown += ROWS_PAGE">
        Mostrar {{ Math.min(ROWS_PAGE, report.employees.value.length - visibleEmployees.length) }} más ({{ report.employees.value.length - visibleEmployees.length }} restantes)
      </button>
    </div>

    <!-- Edit Profile Modal -->
    <Teleport to="body">
      <div v-if="editProfileModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="editProfileModal = null">
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">{{ t('taxes.edit.title') }}</h2>
            <p class="text-sm text-text-muted">{{ editProfileModal.employee.name }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitEditProfile">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.company') }}</label>
              <select v-model="editProfileForm.staffing_company_id"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option :value="null">{{ t('taxes.edit.none') }}</option>
                <option v-for="c in companiesCtx.companies.value" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">SSN</label>
              <input v-model="editProfileForm.ssn" type="text"
                :placeholder="t('taxes.edit.ssnPlaceholder')"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.phone') }}</label>
              <input v-model="editProfileForm.phone" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.address') }}</label>
              <input v-model="editProfileForm.address" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>

            <div class="mt-6 flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="editProfileModal = null">
                {{ t('common.cancel') }}
              </button>
              <button type="submit"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover">
                {{ t('taxes.edit.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Global File Modal -->
    <Teleport to="body">
      <div v-if="globalFileModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="globalFileModal = null">
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">{{ t('taxes.global.title') }}</h2>
            <p class="text-sm text-text-muted">{{ globalFileModal.employee.name }} · {{ year }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitGlobalFile">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.date') }}</label>
              <input v-model="globalFileForm.fileDate" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.file') }}</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp" class="w-full text-sm text-text-secondary"
                @change="onGlobalFileChange" />
              <p v-if="globalFileModal.employee.globalFilePath" class="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <PaperclipIcon class="h-3.5 w-3.5" />
                {{ globalFileModal.employee.globalFileName }}
                <button type="button" class="font-semibold text-primary hover:underline" @click="viewGlobalExisting">
                  {{ t('taxes.view') }}
                </button>
                <button type="button" class="font-semibold text-danger hover:underline" @click="removeGlobalExisting">
                  {{ t('common.delete') }}
                </button>
              </p>
            </div>

            <div class="mt-6 flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="globalFileModal = null">
                {{ t('common.cancel') }}
              </button>
              <button type="submit"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover">
                {{ t('taxes.global.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Cell Modal -->
    <Teleport to="body">
      <div v-if="cellModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="cellModal = null">
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">{{ cellModal.entity.name }}</h2>
            <p class="text-sm text-text-muted">{{ cellModal.employee.name }} · {{ year }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitCell">
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cell-amount">{{ t('taxes.cell.amount') }}</label>
              <input id="cell-amount" v-model.number="cellForm.amount" type="number" min="0" step="0.01"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cell-date">{{ t('taxes.col.date') }}</label>
              <input id="cell-date" v-model="cellForm.entryDate" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text" for="cell-file">{{ t('taxes.col.file') }}</label>
              <input id="cell-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp" class="w-full text-sm text-text-secondary"
                @change="onFileChange" />
              <p v-if="existingFileName" class="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <PaperclipIcon class="h-3.5 w-3.5" />
                {{ existingFileName }}
                <button type="button" class="font-semibold text-primary hover:underline" @click="viewExisting">
                  {{ t('taxes.view') }}
                </button>
                <button type="button" class="font-semibold text-danger hover:underline" @click="removeExisting">
                  {{ t('common.delete') }}
                </button>
              </p>
            </div>

            <p v-if="report.saveError.value" class="text-sm text-danger">{{ report.saveError.value }}</p>

            <div class="flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="cellModal = null">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="report.saveMutation.isPending.value"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ report.saveMutation.isPending.value ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Add Info Modal — the only way a new employee row enters the (otherwise empty) grid -->
    <Teleport to="body">
      <div v-if="addInfoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
        @click.self="closeAddInfo">
        <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-text">{{ t('taxes.add.title') }}</h2>
            <p class="text-sm text-text-muted">{{ t('taxes.add.subtitle', { year }) }}</p>
          </div>

          <form class="space-y-4" @submit.prevent="submitAddInfo">
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.add.employee') }}</label>
              <FormSearchSelect
                v-model="addInfoForm.employeeId"
                :options="availableEmployeeOptions"
                :placeholder="t('taxes.add.selectEmployee')"
                :search-placeholder="t('taxes.add.searchEmployee')"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.company') }}</label>
              <select v-model="addInfoForm.staffing_company_id"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option :value="null">{{ t('taxes.edit.none') }}</option>
                <option v-for="c in companiesCtx.companies.value" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.phone') }}</label>
                <input v-model="addInfoForm.phone" type="text"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text">SSN</label>
                <input v-model="addInfoForm.ssn" type="text"
                  class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.address') }}</label>
              <input v-model="addInfoForm.address" type="text"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.status') }}</label>
              <select v-model="addInfoForm.status"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30">
                <option value="BLANK">{{ t('taxes.status.BLANK') }}</option>
                <option value="SENT_TO_EMPLOYEE">{{ t('taxes.status.SENT_TO_EMPLOYEE') }}</option>
                <option value="SENT_TO_ACCOUNTANT">{{ t('taxes.status.SENT_TO_ACCOUNTANT') }}</option>
                <option value="PENDING_TO_SEND">{{ t('taxes.status.PENDING_TO_SEND') }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.add.fileDate') }}</label>
              <input v-model="addInfoForm.fileDate" type="date"
                class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-text">{{ t('taxes.col.file') }}</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp" class="w-full text-sm text-text-secondary"
                @change="onAddInfoFileChange" />
            </div>

            <div v-if="report.entities.value.length" class="space-y-3 rounded-xl border border-border p-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">{{ t('taxes.add.amountsTitle') }}</p>
              <div v-for="entity in report.entities.value" :key="entity.id" class="grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-1 block text-xs text-text-muted">{{ t('taxes.add.entityAmount', { entity: entity.name }) }}</label>
                  <input v-model.number="addInfoEntities[entity.id].amount" type="number" min="0" step="0.01"
                    class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-theme focus:border-primary focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label class="mb-1 block text-xs text-text-muted">{{ t('taxes.add.entityFile', { entity: entity.name }) }}</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp" class="w-full text-xs text-text-secondary"
                    @change="onAddInfoEntityFileChange(entity.id, $event)" />
                </div>
              </div>
            </div>

            <p v-if="addInfoError" class="text-sm text-danger">{{ addInfoError }}</p>

            <div class="mt-2 flex items-center justify-end gap-3">
              <button type="button"
                class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-theme hover:bg-bg-secondary"
                @click="closeAddInfo">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" :disabled="isSavingAddInfo || !addInfoForm.employeeId"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse shadow-sm transition-theme hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {{ isSavingAddInfo ? t('common.saving') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </FeatureGate>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuth } from '../composables/common/useAuth'
import { FeatureGate } from '../components/common'
import { FormSearchSelect } from '../components/forms'
import { useAnnualTaxReport } from '../composables/staffing/useAnnualTaxReport'
import { useStaffingTaxEntities } from '../composables/staffing/useStaffingTaxEntities'
import { useEmpresas } from '../composables/staffing/useEmpresas'
import { useCurrency } from '../composables/common/useCurrency'
import { useNotification } from '../composables/common/useNotification'
import { translateError } from '../lib/errors'
import { useI18n } from '../i18n'
import { equipoKeys, listEquipo } from '../services/equipoService'
import type { StaffingAnnualTaxEmployeeRow, StaffingTaxEntityRow, StaffingAnnualTaxStatus } from '../services/staffing/staffingService'
import { DocumentIcon, ArrowLeftIcon, ArrowRightIcon, CloseCircleIcon, PaperclipIcon } from '@solar-icons/vue/linear'

const { authStore } = useAuth()
const businessId = computed(() => authStore.businessId)
const { formatUSD } = useCurrency()
const { error: showError } = useNotification()
const { t } = useI18n()

const year = ref(new Date().getFullYear())

// With hundreds of employees (one column per tax entity each), only the first ROWS_PAGE rows are drawn at a time.
const ROWS_PAGE = 50
const rowsShown = ref(ROWS_PAGE)
watch(year, () => { rowsShown.value = ROWS_PAGE })
const showEntities = ref(false)

const report = useAnnualTaxReport(businessId, year)
const visibleEmployees = computed(() => report.employees.value.slice(0, rowsShown.value))
const entitiesCtx = useStaffingTaxEntities(businessId)
const companiesCtx = useEmpresas(businessId)

const { data: allEmployees } = useQuery({
  queryKey: computed(() => equipoKeys.all(businessId.value)),
  queryFn: () => listEquipo(businessId.value!),
  enabled: computed(() => !!businessId.value),
})

const statusColors: Record<StaffingAnnualTaxStatus, string> = {
  BLANK: 'bg-bg-secondary text-text-muted',
  SENT_TO_EMPLOYEE: 'bg-success/10 text-success',
  SENT_TO_ACCOUNTANT: 'bg-warning/10 text-warning',
  PENDING_TO_SEND: 'bg-danger/10 text-danger'
}

const updateStatus = async (employee: StaffingAnnualTaxEmployeeRow, event: Event) => {
  const newStatus = (event.target as HTMLSelectElement).value as StaffingAnnualTaxStatus
  await report.saveGlobalEntry({
    employeeId: employee.employeeId,
    year: year.value,
    status: newStatus
  })
}

// Edit Profile Modal
const editProfileModal = ref<{ employee: StaffingAnnualTaxEmployeeRow } | null>(null)
const editProfileForm = ref({
  staffing_company_id: null as string | null,
  ssn: '',
  phone: '',
  address: ''
})

const openEditProfile = (employee: StaffingAnnualTaxEmployeeRow) => {
  editProfileForm.value = {
    staffing_company_id: employee.companyId || null,
    ssn: '',
    phone: employee.phone || '',
    address: employee.address || ''
  }
  editProfileModal.value = { employee }
}

const submitEditProfile = async () => {
  if (!editProfileModal.value) return
  await report.updateEmployee(editProfileModal.value.employee.employeeId, editProfileForm.value)
  editProfileModal.value = null
}

// Global File Modal
const globalFileModal = ref<{ employee: StaffingAnnualTaxEmployeeRow } | null>(null)
const globalFileForm = ref({ fileDate: '' })
const globalFile = ref<File | null>(null)

const openGlobalFileModal = (employee: StaffingAnnualTaxEmployeeRow) => {
  globalFileForm.value = { fileDate: employee.globalFileDate || '' }
  globalFile.value = null
  globalFileModal.value = { employee }
}

const onGlobalFileChange = (event: Event) => {
  globalFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

const submitGlobalFile = async () => {
  if (!globalFileModal.value) return
  await report.saveGlobalEntry({
    employeeId: globalFileModal.value.employee.employeeId,
    year: year.value,
    fileDate: globalFileForm.value.fileDate || undefined,
    file: globalFile.value
  })
  globalFileModal.value = null
}

const viewGlobalExisting = () => {
  if (globalFileModal.value?.employee.employeeId) {
    report.viewGlobalFile(globalFileModal.value.employee.employeeId)
  }
}

const removeGlobalExisting = () => {
  if (!globalFileModal.value) return
  if (window.confirm(t('taxes.confirmDeleteFile'))) {
    report.removeGlobalFile(globalFileModal.value.employee.employeeId)
    globalFileModal.value = null
  }
}

// Entities Logic
const newEntityName = ref('')
const submitNewEntity = async () => {
  const name = newEntityName.value.trim()
  if (!name) return
  await entitiesCtx.handleSave({ name, active: true })
  newEntityName.value = ''
}
const removeEntity = (id: string) => {
  if (window.confirm(t('taxes.confirmDeleteEntity'))) {
    entitiesCtx.handleDelete(id)
  }
}

// Cell Modal (Amounts per entity)
const cellModal = ref<{ employee: StaffingAnnualTaxEmployeeRow; entity: StaffingTaxEntityRow } | null>(null)
const cellForm = ref<{ amount: number; entryDate: string }>({ amount: 0, entryDate: '' })
const cellFile = ref<File | null>(null)

const existingEntry = computed(() =>
  cellModal.value ? cellModal.value.employee.entriesByEntity[cellModal.value.entity.id] : null,
)
const existingFileName = computed(() => existingEntry.value?.fileName ?? null)

const openCellModal = (employee: StaffingAnnualTaxEmployeeRow, entity: StaffingTaxEntityRow) => {
  const entry = employee.entriesByEntity[entity.id]
  cellForm.value = { amount: entry?.amount ?? 0, entryDate: entry?.entryDate ?? '' }
  cellFile.value = null
  cellModal.value = { employee, entity }
}

const onFileChange = (event: Event) => {
  cellFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

const viewExisting = () => {
  const entry = existingEntry.value
  if (entry) report.viewFile(entry.entryId)
}

const removeExisting = () => {
  const entry = existingEntry.value
  if (!entry) return
  if (window.confirm(t('taxes.confirmDeleteFile'))) {
    report.removeFile(entry.entryId)
    cellModal.value = null
  }
}

const submitCell = async () => {
  if (!cellModal.value) return
  const ok = await report.saveEntry({
    employeeId: cellModal.value.employee.employeeId,
    taxEntityId: cellModal.value.entity.id,
    year: year.value,
    amount: cellForm.value.amount || 0,
    entryDate: cellForm.value.entryDate || undefined,
    file: cellFile.value,
  })
  if (ok) cellModal.value = null
}

// Add Info Modal — creates the employee's row for this year (see StaffingReportService::
// annualTaxReport, which now only lists employees who already have a record) and, in the same
// form, fills in the same fields the click-to-edit cells already expose.
const addInfoModal = ref(false)
const addInfoError = ref('')
const isSavingAddInfo = ref(false)

const addedEmployeeIds = computed(() => new Set(report.employees.value.map(e => e.employeeId)))
const availableEmployeeOptions = computed(() =>
  (allEmployees.value ?? [])
    .filter(e => !addedEmployeeIds.value.has(e.id))
    .map(e => ({ value: e.id, label: e.name })),
)

const addInfoForm = ref({
  employeeId: '',
  staffing_company_id: null as string | null,
  phone: '',
  address: '',
  ssn: '',
  status: 'BLANK' as StaffingAnnualTaxStatus,
  fileDate: '',
})
const addInfoFile = ref<File | null>(null)
const addInfoEntities = reactive<Record<string, { amount: number; file: File | null }>>({})

// Rebuilt whenever the entity columns change so a newly-added column is fillable too, even if
// the modal was already open (Gestionar entidades can be toggled without closing this one).
watch(() => report.entities.value, (entities) => {
  for (const entity of entities) {
    if (!(entity.id in addInfoEntities)) addInfoEntities[entity.id] = { amount: 0, file: null }
  }
}, { immediate: true })

const openAddInfo = () => {
  addInfoForm.value = {
    employeeId: '', staffing_company_id: null, phone: '', address: '', ssn: '',
    status: 'BLANK', fileDate: '',
  }
  addInfoFile.value = null
  for (const entity of report.entities.value) {
    addInfoEntities[entity.id] = { amount: 0, file: null }
  }
  addInfoError.value = ''
  addInfoModal.value = true
}

const closeAddInfo = () => { addInfoModal.value = false }

const onAddInfoFileChange = (event: Event) => {
  addInfoFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

const onAddInfoEntityFileChange = (entityId: string, event: Event) => {
  addInfoEntities[entityId].file = (event.target as HTMLInputElement).files?.[0] ?? null
}

const submitAddInfo = async () => {
  const employeeId = addInfoForm.value.employeeId
  if (!employeeId) return

  addInfoError.value = ''
  isSavingAddInfo.value = true
  try {
    await report.updateEmployee(employeeId, {
      staffing_company_id: addInfoForm.value.staffing_company_id,
      phone: addInfoForm.value.phone,
      address: addInfoForm.value.address,
      ssn: addInfoForm.value.ssn,
    })

    await report.saveGlobalEntry({
      employeeId,
      year: year.value,
      status: addInfoForm.value.status,
      fileDate: addInfoForm.value.fileDate || undefined,
      file: addInfoFile.value,
    })

    for (const entity of report.entities.value) {
      const cell = addInfoEntities[entity.id]
      if (!cell || (!cell.amount && !cell.file)) continue
      await report.saveEntry({
        employeeId,
        taxEntityId: entity.id,
        year: year.value,
        amount: cell.amount || 0,
        file: cell.file,
      })
    }

    addInfoModal.value = false
  } catch (err) {
    addInfoError.value = translateError(err)
    showError(addInfoError.value)
  } finally {
    isSavingAddInfo.value = false
  }
}
</script>
