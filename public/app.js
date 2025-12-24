const STEP_TOTAL = 6;
const ACCENT_COLORS = {
    emerald: '#10b981',
    blue: '#2563eb',
    red: '#ef4444',
    purple: '#8b5cf6',
    black: '#111827'
};

const state = {
    currentStep: 1,
    templates: {},
    containers: {},
    isPopulating: false,
    saveTimer: null,
    lastPayload: null,
    preferences: {
        template: 'minimalist',
        accent: 'blue'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    cacheTemplates();
    attachStepNavigation();
    attachAddButtons();
    attachGlobalInputs();
    attachLivePreviewInputs();
    attachPreferenceControls();
    attachDownloadHandler();
    setupDonationModal();
    loadInitialData();
});

function cacheTemplates() {
    state.templates = {
        experience: document.getElementById('experience-template'),
        education: document.getElementById('education-template'),
        certification: document.getElementById('certification-template')
    };

    state.containers = {
        experience: document.getElementById('experience-forms'),
        education: document.getElementById('education-forms'),
        certification: document.getElementById('certification-forms')
    };
}

function attachStepNavigation() {
    const navItems = document.querySelectorAll('[data-step]');
    navItems.forEach((nav) => {
        nav.addEventListener('click', () => {
            const step = parseInt(nav.getAttribute('data-step'), 10);
            nextStep(step);
        });
    });

    window.nextStep = (stepNumber) => {
        if (typeof stepNumber !== 'number') return;
        if (stepNumber < 1 || stepNumber > STEP_TOTAL) return;
        state.currentStep = stepNumber;
        updateStepUI();
    };

    updateStepUI();
}

function updateStepUI() {
  const forms = document.querySelectorAll('.form-step');
  forms.forEach((form) => form.classList.add('hidden'));
  const activeForm = document.getElementById(`form-step-${state.currentStep}`);
  if (activeForm) {
    activeForm.classList.remove('hidden');
    const sidebar = document.getElementById('editor-sidebar');
    if (sidebar) sidebar.scrollTop = 0;
  }

    document.querySelectorAll('[data-step]').forEach((navItem) => {
        const stepValue = parseInt(navItem.getAttribute('data-step'), 10);
        const circle = navItem.querySelector('span');
        navItem.classList.remove('step-active', 'text-emerald-600', 'text-gray-800');
        navItem.classList.add('text-gray-500');
        if (circle) {
            circle.classList.remove('bg-emerald-500', 'text-white', 'bg-emerald-100', 'text-emerald-700', 'font-semibold', 'border-gray-400');
            circle.classList.add('border', 'bg-white', 'text-gray-700', 'border-gray-400');
            circle.innerHTML = stepValue;
        }

        if (stepValue === state.currentStep) {
            navItem.classList.remove('text-gray-500');
            navItem.classList.add('step-active');
            if (circle) {
                circle.classList.add('bg-emerald-500', 'text-white');
                circle.classList.remove('border-gray-400');
            }
        } else if (stepValue < state.currentStep) {
            navItem.classList.remove('text-gray-500');
            navItem.classList.add('text-gray-800');
            if (circle) {
                circle.classList.add('bg-emerald-100', 'text-emerald-700', 'font-semibold');
                circle.innerHTML = '&#10003;';
            }
        }
    });
}

function attachAddButtons() {
    document.querySelectorAll('[data-add-entry]').forEach((button) => {
        button.addEventListener('click', () => {
            const type = button.getAttribute('data-add-entry');
            addEntry(type);
        });
    });
}

function attachGlobalInputs() {
    const groups = ['form-step-1', 'form-step-2', 'form-step-3', 'form-step-4', 'form-step-5', 'form-step-6'];
    groups.forEach((groupId) => {
        const group = document.getElementById(groupId);
        if (group) {
            group.addEventListener('input', handleDataChange);
        }
    });
}

function attachLivePreviewInputs() {
    const controls = document.querySelectorAll('.form-step input, .form-step textarea');
    controls.forEach((el) => {
        el.addEventListener('input', handleDataChange);
    });
}

function attachPreferenceControls() {
    document.querySelectorAll('[data-template-option]').forEach((button) => {
        button.addEventListener('click', () => {
            const template = button.getAttribute('data-template-option');
            if (!template || template === state.preferences.template) return;
            state.preferences.template = template;
            syncPreferenceUI();
            handleDataChange();
        });
    });

    document.querySelectorAll('[data-accent-option]').forEach((button) => {
        button.addEventListener('click', () => {
            const accent = button.getAttribute('data-accent-option');
            if (!accent || accent === state.preferences.accent) return;
            state.preferences.accent = accent;
            syncPreferenceUI();
            handleDataChange();
        });
    });

    syncPreferenceUI();
}

function attachDownloadHandler() {
    const downloadBtn = document.getElementById('download-pdf-btn');
    if (!downloadBtn) return;
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        downloadPdf();
    });
}

let donationResolve = null;
let lastDownloadUrl = null;

function setupDonationModal() {
    const modal = document.getElementById('donate-modal');
    const cta = document.getElementById('donate-cta');
    const skip = document.getElementById('donate-skip');
    const close = document.getElementById('donate-close');
    if (!modal || !cta || !skip || !close) return;

    const finish = (choice) => {
        modal.classList.add('hidden');
        const resolver = donationResolve;
        donationResolve = null;
        if (resolver) resolver(choice);
    };

    cta.addEventListener('click', () => finish('donate'));
    skip.addEventListener('click', () => finish('skip'));
    close.addEventListener('click', () => finish('skip'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) finish('skip');
    });
}

function showDonationPrompt() {
    const modal = document.getElementById('donate-modal');
    return new Promise((resolve) => {
        if (!modal) return resolve('skip');
        donationResolve = resolve;
        modal.classList.remove('hidden');
    });
}

async function downloadPdf() {
    try {
        const donateUrl = 'https://trakteer.id/muhrafli13/tip';
        const choice = await showDonationPrompt();
        if (choice === 'donate') {
            window.open(donateUrl, '_blank', 'noopener');
        }

        setSaveIndicator('Menyiapkan PDF...', 'muted');
        setPdfFallbackLink(null);
        const safeName = (state.lastPayload?.personal?.full_name || 'cv-builder').replace(/[^a-z0-9\-]+/gi, '-');
        const downloaded = await tryServerPdfDownload(safeName);
        if (!downloaded) {
            await downloadPdfFromPreview(`${safeName}.pdf`);
            setSaveIndicator('PDF siap. Jika tidak otomatis terunduh, klik link di bawah tombol.', 'success');
            return;
        }
        setSaveIndicator('PDF berhasil dibuat', 'success');
    } catch (error) {
        console.error(error);
        setSaveIndicator('Gagal membuat PDF', 'error');
    }
}

function setPdfFallbackLink(url, filename) {
    const link = document.getElementById('pdf-fallback-link');
    if (!link) return;

    if (lastDownloadUrl) {
        URL.revokeObjectURL(lastDownloadUrl);
        lastDownloadUrl = null;
    }

    if (!url) {
        link.classList.add('hidden');
        link.removeAttribute('href');
        link.removeAttribute('download');
        return;
    }

    lastDownloadUrl = url;
    link.href = url;
    link.download = filename || 'cv-builder.pdf';
    link.classList.remove('hidden');
}

function triggerDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'cv-builder.pdf';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

async function tryServerPdfDownload(fileBaseName) {
    try {
        const response = await fetch('/api/cv/pdf');
        if (!response.ok) return false;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('application/pdf')) return false;
        const blob = await response.blob();
        if (!blob || !blob.size) return false;
        const url = URL.createObjectURL(blob);
        const filename = `${fileBaseName}.pdf`;
        setPdfFallbackLink(url, filename);
        triggerDownload(url, filename);
        return true;
    } catch (error) {
        console.warn('PDF server tidak tersedia, gunakan unduh dari browser.', error);
        return false;
    }
}

async function downloadPdfFromPreview(filename) {
    let target = document.querySelector('#preview-canvas .cv-page');
    if (!target) {
        const fallback = collectFormData();
        renderPreview(fallback);
        target = document.querySelector('#preview-canvas .cv-page');
    }
    if (!target) {
        throw new Error('Preview tidak ditemukan');
    }

    if (document.fonts && document.fonts.ready) {
        try {
            await document.fonts.ready;
        } catch (error) {
            console.warn('Gagal memuat font sebelum unduh.', error);
        }
    }
    if (typeof window.html2pdf !== 'function') {
        throw new Error('html2pdf tidak tersedia');
    }

    const options = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] }
    };

    const sandbox = document.createElement('div');
    sandbox.style.position = 'fixed';
    sandbox.style.left = '-10000px';
    sandbox.style.top = '0';
    sandbox.style.width = 'auto';
    const clone = target.cloneNode(true);
    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    try {
        const blob = await window.html2pdf().set(options).from(clone).outputPdf('blob');
        if (!blob || !blob.size) {
            throw new Error('PDF kosong');
        }
        const url = URL.createObjectURL(blob);
        setPdfFallbackLink(url, filename);
        triggerDownload(url, filename);
    } finally {
        sandbox.remove();
    }
}

async function loadInitialData() {
    setSaveIndicator('Memuat data awal...', 'muted');
    try {
        const data = await fetchCvData();
        populateForm(data);
        renderPreview(data);
        state.lastPayload = data;
        setSaveIndicator('Semua perubahan tersimpan', 'success');
    } catch (error) {
        console.error('Gagal memuat data:', error);
        const fallback = collectFormData();
        renderPreview(fallback);
        state.lastPayload = fallback;
        setSaveIndicator('Mode offline: data tidak tersimpan', 'error');
    }
}

async function fetchCvData() {
    const response = await fetch('/api/cv');
    if (!response.ok) {
        throw new Error('Tidak dapat memuat CV dari server');
    }
    return response.json();
}

function populateForm(data) {
    state.isPopulating = true;
    document.getElementById('full_name').value = data.personal.full_name || '';
    document.getElementById('email').value = data.personal.email || '';
    document.getElementById('phone').value = data.personal.phone || '';
    document.getElementById('address').value = data.personal.address || '';
    const linkedinInput = document.getElementById('linkedin');
    if (linkedinInput) linkedinInput.value = data.personal.linkedin || '';
    const portfolioInput = document.getElementById('portfolio');
    if (portfolioInput) portfolioInput.value = data.personal.portfolio || '';
    document.getElementById('summary').value = data.summary.description || '';
    document.getElementById('title').value = data.summary.title || '';
    document.getElementById('skills').value = (data.skills || []).join(', ');
    const softSkillsInput = document.getElementById('soft_skills');
    if (softSkillsInput) softSkillsInput.value = (data.softSkills || []).join(', ');
    document.getElementById('languages').value = (data.languages || []).join(', ');

    renderEntryForms('experience', data.experience);
    renderEntryForms('education', data.education);
    renderEntryForms('certification', data.certifications);

    state.preferences = {
        template: data.preferences?.template || 'minimalist',
        accent: data.preferences?.accent || 'blue'
    };
    syncPreferenceUI();
    state.isPopulating = false;
}

function renderEntryForms(type, entries) {
    const container = state.containers[type];
    if (!container) return;
    container.innerHTML = '';
    const items = Array.isArray(entries) && entries.length ? entries : [null];
    items.forEach((entry) => addEntry(type, entry, { silent: true }));
}

function addEntry(type, preset = null, options = {}) {
    const template = state.templates[type];
    const container = state.containers[type];
    if (!template || !container) return;

    const fragment = template.content.cloneNode(true);
    const entry = fragment.querySelector('[data-entry-type]');
    if (!entry) return;

    const fields = entry.querySelectorAll('[data-field]');
    fields.forEach((field) => {
        const key = field.getAttribute('data-field');
        if (preset && Object.prototype.hasOwnProperty.call(preset, key)) {
            if (Array.isArray(preset[key])) {
                field.value = preset[key].join('\n');
            } else {
                field.value = preset[key] || '';
            }
        } else {
            field.value = '';
        }
    });

    const removeBtn = entry.querySelector('[data-remove-entry]');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            entry.remove();
            handleDataChange();
        });
    }

    entry.addEventListener('input', handleDataChange);
    container.appendChild(entry);

    if (!options.silent) {
        handleDataChange();
    }
}

function handleDataChange() {
    if (state.isPopulating) return;
    const payload = collectFormData();
    renderPreview(payload);
    queueSave(payload);
}

function collectFormData() {
    return {
        personal: {
            full_name: document.getElementById('full_name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            linkedin: (document.getElementById('linkedin')?.value || '').trim(),
            portfolio: (document.getElementById('portfolio')?.value || '').trim()
        },
        summary: {
            description: document.getElementById('summary').value.trim(),
            title: document.getElementById('title').value.trim()
        },
        experience: filterEntries(collectEntries('experience', (entry) => ({
            position: getFieldValue(entry, 'position'),
            company: getFieldValue(entry, 'company'),
            location: getFieldValue(entry, 'location'),
            startDate: getFieldValue(entry, 'startDate'),
            endDate: getFieldValue(entry, 'endDate'),
            achievements: parseList(getFieldValue(entry, 'achievements'), { mode: 'line' })
        }))),
        education: filterEntries(collectEntries('education', (entry) => ({
            degree: getFieldValue(entry, 'degree'),
            institution: getFieldValue(entry, 'institution'),
            graduationYear: getFieldValue(entry, 'graduationYear'),
            gpa: getFieldValue(entry, 'gpa')
        }))),
        certifications: filterEntries(collectEntries('certification', (entry) => ({
            name: getFieldValue(entry, 'name'),
            provider: getFieldValue(entry, 'provider'),
            year: getFieldValue(entry, 'year')
        }))),
        skills: parseList(document.getElementById('skills').value),
        softSkills: parseList(document.getElementById('soft_skills')?.value || ''),
        languages: parseList(document.getElementById('languages').value),
        preferences: {
            template: state.preferences.template,
            accent: state.preferences.accent
        }
    };
}

function collectEntries(type, mapper) {
    const container = state.containers[type];
    if (!container) return [];
    const entries = Array.from(container.querySelectorAll(`[data-entry-type="${type}"]`));
    return entries.map(mapper);
}

function getFieldValue(entry, field) {
    const element = entry.querySelector(`[data-field="${field}"]`);
    return element ? element.value.trim() : '';
}

function parseList(value = '', options = { mode: 'comma' }) {
    if (!value) return [];
    const delimiter = options.mode === 'line' ? /\n+/ : /,|\n/;
    return value
        .split(delimiter)
        .map((item) => item.trim())
        .filter((item) => Boolean(item));
}

function filterEntries(entries = []) {
    return entries.filter((item) =>
        Object.values(item).some((value) => {
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return Boolean(value);
        })
    );
}

function queueSave(payload) {
    state.lastPayload = payload;
    setSaveIndicator('Menyimpan...', 'muted');
    if (state.saveTimer) {
        clearTimeout(state.saveTimer);
    }
    state.saveTimer = setTimeout(() => saveToServer(payload), 400);
}

async function saveToServer(payload) {
    try {
        const response = await fetch('/api/cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error('Gagal menyimpan data');
        }
        const data = await response.json();
        renderPreview(data);
        state.lastPayload = data;
        setSaveIndicator('Semua perubahan tersimpan', 'success');
    } catch (error) {
        console.error('Gagal menyimpan data:', error);
        setSaveIndicator('Gagal menyimpan data', 'error');
    }
}

function renderPreview(data) {
    const accentKey = data.preferences?.accent || 'blue';
    const accentHex = ACCENT_COLORS[accentKey] || ACCENT_COLORS.blue || ACCENT_COLORS.emerald;
    document.documentElement.style.setProperty('--accent-color', accentHex);

    const html = buildAtsPreviewTemplate(data);
    const canvas = document.getElementById('preview-canvas');
    if (canvas) {
        canvas.innerHTML = html;
    }
    const placeholder = document.getElementById('preview-placeholder');
    if (placeholder) {
        placeholder.classList.toggle('hidden', Boolean(html.trim()));
    }
}

function buildAtsPreviewTemplate(data) {
    const personal = data.personal || {};
    const summary = data.summary || {};
    const name = escapeHtml(personal.full_name || 'NAMA LENGKAP ANDA').toUpperCase();
    const summaryTitle = escapeHtml(summary.title || 'Nama Jabatan Anda');
    const summaryText = escapeHtml(
        summary.description ||
            'dengan pengalaman [Jumlah] tahun dalam [Spesialisasi Utama]. Ahli dalam mengelola [Tugas Terpenting] dan memberikan solusi strategis yang meningkatkan efisiensi operasional.'
    );
    const summarySuffix = summaryText ? ` ${summaryText}` : '';

    const summaryHtml = `<p class="summary-text"><strong>${summaryTitle}</strong>${summarySuffix}</p>`;
    const experienceHtml = renderExperiencePreview(data.experience || []);
    const educationHtml = renderEducationPreview(data.education || []);
    const skillsHtml = renderSkillsPreview(data);

    return `
        <div class="cv-page">
            <header class="cv-header">
                <h1>${name}</h1>
                <div class="contact-line">${buildContactLine(personal)}</div>
                <div class="contact-line cv-contact-links">${buildLinkLine(personal)}</div>
            </header>
            ${renderPreviewSection('Profil Profesional', summaryHtml)}
            ${renderPreviewSection('Pengalaman Kerja', experienceHtml)}
            ${renderPreviewSection('Pendidikan', educationHtml)}
            ${renderPreviewSection('Keterampilan & Sertifikasi', skillsHtml)}
        </div>
    `;
}

function buildContactLine(personal) {
    const location = escapeHtml(personal.address || 'Kota, Provinsi');
    const phone = escapeHtml(personal.phone || 'Nomor Telepon');
    const email = escapeHtml(personal.email || 'Alamat Email');
    return [location, phone, email].join(' | ');
}

function buildLinkLine(personal) {
    const linkedinText = personal.linkedin || 'linkedin.com/in/username';
    const portfolioText = personal.portfolio || 'portfolio-link.com';
    const linkedinHref = personal.linkedin ? normalizeUrl(personal.linkedin) : '#';
    const portfolioHref = personal.portfolio ? normalizeUrl(personal.portfolio) : '#';
    const linkedinAttrs = personal.linkedin ? ' target="_blank" rel="noopener"' : '';
    const portfolioAttrs = personal.portfolio ? ' target="_blank" rel="noopener"' : '';

    const linkedinLink = `<a href="${escapeHtml(linkedinHref)}" class="cv-link"${linkedinAttrs}>${escapeHtml(linkedinText)}</a>`;
    const portfolioLink = `<a href="${escapeHtml(portfolioHref)}" class="cv-link"${portfolioAttrs}>${escapeHtml(portfolioText)}</a>`;
    return `${linkedinLink} | ${portfolioLink}`;
}

function normalizeUrl(value = '') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

function renderPreviewSection(title, content) {
    return `
        <section>
            <h2>${escapeHtml(title)}</h2>
            <hr>
            ${content}
        </section>
    `;
}

function renderExperiencePreview(list = []) {
    if (!list.length) return '<p class="cv-empty">Belum ada pengalaman.</p>';
    return list
        .map((item) => {
            const timelineParts = [item.startDate, item.endDate].filter(Boolean).map(escapeHtml);
            const timeline = timelineParts.length ? timelineParts.join(' &ndash; ') : 'Bulan Tahun - Sekarang';
            const company = escapeHtml(item.company || 'Nama Perusahaan');
            const position = escapeHtml(item.position || 'Jabatan/Posisi');
            const location = escapeHtml(item.location || 'Lokasi');
            const achievements = (item.achievements || []).map((ach) => `<li>${escapeHtml(ach)}</li>`).join('');
            return `
                <div class="cv-block">
                    <div class="item-header">
                        <span>${company}</span>
                        <span>${timeline}</span>
                    </div>
                    <div class="item-sub">
                        <span class="cv-italic">${position}</span>
                        <span>${location}</span>
                    </div>
                    ${achievements ? `<ul>${achievements}</ul>` : ''}
                </div>
            `;
        })
        .join('');
}

function renderEducationPreview(list = []) {
    if (!list.length) return '<p class="cv-empty">Belum ada pendidikan.</p>';
    return list
        .map((item) => {
            const institution = escapeHtml(item.institution || 'Nama Universitas / Institusi');
            const year = escapeHtml(item.graduationYear || 'Tahun Lulus');
            const degree = escapeHtml(item.degree || 'Gelar Akademik, Jurusan');
            const rawGpa = item.gpa || '';
            const gpaText = rawGpa
                ? /ipk/i.test(rawGpa)
                    ? escapeHtml(rawGpa)
                    : `IPK: ${escapeHtml(rawGpa)}`
                : 'IPK: -';
            return `
                <div class="cv-block">
                    <div class="item-header">
                        <span>${institution}</span>
                        <span>${year}</span>
                    </div>
                    <div class="item-sub">
                        <span>${degree}</span>
                        <span>${gpaText}</span>
                    </div>
                </div>
            `;
        })
        .join('');
}

function renderSkillsPreview(data) {
    const lines = [];
    if (data.skills && data.skills.length) {
        lines.push({ label: 'Teknikal Skill', value: data.skills.map(escapeHtml).join(', ') });
    }
    if (data.softSkills && data.softSkills.length) {
        lines.push({ label: 'Soft Skill', value: data.softSkills.map(escapeHtml).join(', ') });
    }
    if (data.languages && data.languages.length) {
        lines.push({ label: 'Bahasa', value: data.languages.map(escapeHtml).join(', ') });
    }
    if (data.certifications && data.certifications.length) {
        const certs = data.certifications.map(formatCertification).filter(Boolean);
        if (certs.length) {
            lines.push({ label: 'Sertifikasi', value: certs.join(', ') });
        }
    }

    if (!lines.length) {
        return '<p class="cv-empty">Belum ada keterampilan.</p>';
    }

    return `
        <div class="cv-skill-list">
            ${lines
                .map((line) => `<div class="cv-skill-line"><span class="cv-skill-label">${escapeHtml(line.label)}:</span> ${line.value}</div>`)
                .join('')}
        </div>
    `;
}

function formatCertification(cert) {
    if (!cert || !cert.name) return '';
    const name = escapeHtml(cert.name);
    const provider = cert.provider ? ` &ndash; ${escapeHtml(cert.provider)}` : '';
    const year = cert.year ? ` (${escapeHtml(cert.year)})` : '';
    return `${name}${provider}${year}`;
}

function syncPreferenceUI() {
    document.querySelectorAll('[data-template-option]').forEach((button) => {
        const template = button.getAttribute('data-template-option');
        button.classList.toggle('active', template === state.preferences.template);
    });

    document.querySelectorAll('[data-accent-option]').forEach((button) => {
        const accent = button.getAttribute('data-accent-option');
        button.classList.toggle('active', accent === state.preferences.accent);
    });

    const accentHex = ACCENT_COLORS[state.preferences.accent] || ACCENT_COLORS.emerald;
    document.documentElement.style.setProperty('--accent-color', accentHex);
}

function adjustColor(hex, amount = 0) {
    const sanitized = hex.replace('#', '');
    if (sanitized.length !== 6) return hex;
    const num = parseInt(sanitized, 16);
    const clamp = (value) => Math.max(0, Math.min(255, value));
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00ff) + amount);
    const b = clamp((num & 0x0000ff) + amount);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgba(hex, alpha = 1) {
    const sanitized = hex.replace('#', '');
    if (sanitized.length !== 6) return `rgba(16, 185, 129, ${alpha})`;
    const r = parseInt(sanitized.slice(0, 2), 16);
    const g = parseInt(sanitized.slice(2, 4), 16);
    const b = parseInt(sanitized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(value = '') {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setSaveIndicator(message, tone = 'muted') {
    const indicator = document.getElementById('save-indicator');
    if (!indicator) return;
    indicator.classList.remove('hidden', 'text-gray-500', 'text-emerald-600', 'text-red-500');
    const toneClass = tone === 'error' ? 'text-red-500' : tone === 'success' ? 'text-emerald-600' : 'text-gray-500';
    indicator.classList.add(toneClass);
    indicator.textContent = message;
    if (!message) {
        indicator.classList.add('hidden');
    }
}
