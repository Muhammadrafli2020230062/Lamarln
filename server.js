const express = require('express');
const path = require('path');
const cors = require('cors');
const PDFDocument = require('pdfkit');

const ALLOWED_TEMPLATES = ['minimalist', 'modern'];
const ACCENT_MAP = {
  emerald: '#10b981',
  blue: '#2563eb',
  red: '#ef4444',
  purple: '#8b5cf6',
  black: '#111827'
};
const TEXT_SPACING = { lineGap: 3, paragraphGap: 8, characterSpacing: 0.3 };
const MM_TO_PT = 72 / 25.4;
const PDF_MARGINS = {
  top: 15 * MM_TO_PT,
  bottom: 15 * MM_TO_PT,
  left: 18 * MM_TO_PT,
  right: 18 * MM_TO_PT
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

let cvState = getDefaultCv();

app.get('/api/cv', (_req, res) => {
  res.json(cvState);
});

app.post('/api/cv', (req, res) => {
  cvState = sanitizeCvPayload(req.body);
  res.json(cvState);
});

app.get('/api/cv/pdf', (_req, res, next) => {
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cv-builder.pdf"');

    const doc = new PDFDocument({ size: 'A4', margins: PDF_MARGINS });
    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Gagal membuat PDF' });
      } else {
        res.end();
      }
    });

    doc.pipe(res);
    buildPdf(doc, cvState);
    doc.end();
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`CV Builder server running on http://localhost:${PORT}`);
});

function getDefaultCv() {
  return {
    personal: {
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+62 812 3456 7890',
      address: 'Jakarta, DKI Jakarta',
      linkedin: 'linkedin.com/in/username',
      portfolio: 'portfolio-link.com'
    },
    summary: {
      title: 'Senior Front-End Developer',
      description:
        'Insinyur Perangkat Lunak senior dengan pengalaman 5 tahun dalam memimpin pengembangan front-end menggunakan React dan Tailwind CSS. Berhasil meningkatkan kecepatan pemuatan halaman sebesar 30% pada proyek utama.'
    },
    experience: [
      {
        position: 'Software Engineer',
        company: 'Tech Solutions Inc.',
        location: 'Jakarta, Indonesia',
        startDate: 'Januari 2020',
        endDate: 'Sekarang',
        achievements: [
          'Memimpin migrasi UI dari jQuery ke React, mengurangi bug sebesar 40%.',
          'Merancang sistem desain modular reusable.',
          'Mengoptimalkan performa rendering front-end menggunakan Next.js.'
        ]
      }
    ],
    education: [
      {
        degree: 'S.Kom. Ilmu Komputer',
        institution: 'Univ. Teknologi Nasional',
        graduationYear: '2020',
        gpa: '3.8 / 4.0'
      }
    ],
    skills: ['React', 'Tailwind CSS', 'Node.js', 'JavaScript ES6+'],
    softSkills: ['Manajemen Proyek', 'Komunikasi Strategis', 'Negosiasi', 'Pemecahan Masalah'],
    languages: ['Indonesia (Native)', 'Inggris (Advanced)'],
    certifications: [
      {
        name: 'AWS Certified Developer',
        provider: 'Amazon Web Services',
        year: '2023'
      }
    ],
    preferences: {
      template: 'minimalist',
      accent: 'blue'
    }
  };
}

function sanitizeCvPayload(payload = {}) {
  const defaults = getDefaultCv();

  return {
    personal: {
      full_name: clean(payload.personal?.full_name, defaults.personal.full_name),
      email: clean(payload.personal?.email, defaults.personal.email),
      phone: clean(payload.personal?.phone, defaults.personal.phone),
      address: clean(payload.personal?.address, defaults.personal.address),
      linkedin: clean(payload.personal?.linkedin, defaults.personal.linkedin),
      portfolio: clean(payload.personal?.portfolio, defaults.personal.portfolio)
    },
    summary: {
      title: clean(payload.summary?.title, defaults.summary.title),
      description: clean(payload.summary?.description, defaults.summary.description, 1200)
    },
    experience: sanitizeExperience(payload.experience, defaults.experience),
    education: sanitizeEducation(payload.education, defaults.education),
    skills: sanitizeShortList(payload.skills, defaults.skills),
    softSkills: sanitizeShortList(payload.softSkills, defaults.softSkills),
    languages: sanitizeShortList(payload.languages, defaults.languages),
    certifications: sanitizeCertifications(payload.certifications, defaults.certifications),
    preferences: sanitizePreferences(payload.preferences, defaults.preferences)
  };
}

function clean(value, fallback = '', limit = 300) {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.replace(/\s+/g, ' ').trim().slice(0, limit) || fallback;
}

function sanitizeExperience(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }

  const sanitized = list
    .map((item) => ({
      position: clean(item.position, ''),
      company: clean(item.company, ''),
      location: clean(item.location, ''),
      startDate: clean(item.startDate, ''),
      endDate: clean(item.endDate, ''),
      achievements: sanitizeShortList(item.achievements, [])
    }))
    .filter((item) => item.position && item.company);
  return sanitized.length ? sanitized : fallback;
}

function sanitizeEducation(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }

  const sanitized = list
    .map((item) => ({
      degree: clean(item.degree, ''),
      institution: clean(item.institution, ''),
      graduationYear: clean(item.graduationYear, ''),
      gpa: clean(item.gpa, '', 50)
    }))
    .filter((item) => item.degree && item.institution);
  return sanitized.length ? sanitized : fallback;
}

function sanitizeCertifications(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }

  const sanitized = list
    .map((item) => ({
      name: clean(item.name, ''),
      provider: clean(item.provider, ''),
      year: clean(item.year, '')
    }))
    .filter((item) => item.name);
  return sanitized.length ? sanitized : fallback;
}

function sanitizeReferences(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }

  const sanitized = list
    .map((item) => ({
      name: clean(item.name, ''),
      role: clean(item.role, '', 200),
      contact: clean(item.contact, '', 200)
    }))
    .filter((item) => item.name);
  return sanitized.length ? sanitized : fallback;
}

function sanitizeShortList(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }
  const cleaned = list
    .map((entry) => clean(entry, ''))
    .filter((entry) => entry.length > 0)
    .slice(0, 20);
  return cleaned.length ? cleaned : fallback;
}

function sanitizePreferences(prefs, fallback) {
  const template =
    typeof prefs?.template === 'string' && ALLOWED_TEMPLATES.includes(prefs.template)
      ? prefs.template
      : fallback.template;
  const accent =
    typeof prefs?.accent === 'string' && Object.keys(ACCENT_MAP).includes(prefs.accent)
      ? prefs.accent
      : fallback.accent;

  return { template, accent };
}

function buildPdf(doc, data) {
  const personal = data.personal || {};
  const summary = data.summary || {};
  const name = (personal.full_name || 'NAMA LENGKAP ANDA').toUpperCase();
  const contactLine = [
    personal.address || 'Kota, Provinsi',
    personal.phone || 'Nomor Telepon',
    personal.email || 'Alamat Email'
  ].join(' | ');
  const linkLine = [
    personal.linkedin || 'linkedin.com/in/username',
    personal.portfolio || 'portfolio-link.com'
  ].join(' | ');
  const startX = doc.page.margins.left;

  doc.font('Helvetica-Bold').fontSize(24).fillColor('#1a202c').text(name, { align: 'center', ...TEXT_SPACING });
  doc.font('Helvetica').fontSize(10).fillColor('#1a202c').text(contactLine, { align: 'center', ...TEXT_SPACING });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#1e40af')
    .text(linkLine, { align: 'center', underline: true, ...TEXT_SPACING });
  doc.moveDown(0.6);

  sectionSimple(doc, 'Profil Profesional', () => {
    const title = summary.title || 'Nama Jabatan Anda';
    const description = summary.description || 'Tuliskan ringkasan profesional Anda di sini.';
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor('#1a202c')
      .text(`${title} `, { continued: true, width: getBodyWidth(doc), ...TEXT_SPACING });
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor('#1a202c')
      .text(description, { width: getBodyWidth(doc), ...TEXT_SPACING });
  });

  sectionSimple(doc, 'Pengalaman Kerja', () => {
    const bodyWidth = getBodyWidth(doc);
    const leftWidth = bodyWidth * 0.7;
    const rightWidth = bodyWidth - leftWidth;
    if (!Array.isArray(data.experience) || !data.experience.length) {
      writeText(doc, 'Belum ada pengalaman.', 10, '#6b7280');
      return;
    }

    data.experience.forEach((exp, index) => {
      const timelineParts = [exp.startDate, exp.endDate].filter(Boolean);
      const timeline = timelineParts.length ? timelineParts.join(' - ') : 'Bulan Tahun - Sekarang';
      const company = exp.company || 'Nama Perusahaan';
      const position = exp.position || 'Jabatan/Posisi';
      const location = exp.location || 'Lokasi';
      const topY = doc.y;

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#1a202c')
        .text(company, startX, topY, { width: leftWidth, ...TEXT_SPACING });
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#1a202c')
        .text(timeline, startX + leftWidth, topY, { width: rightWidth, align: 'right', ...TEXT_SPACING });

      const leftHeight = doc.heightOfString(company || '', { width: leftWidth, ...TEXT_SPACING });
      const rightHeight = doc.heightOfString(timeline || '', { width: rightWidth, ...TEXT_SPACING });
      doc.y = topY + Math.max(leftHeight, rightHeight);

      const subY = doc.y;
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor('#2d3748')
        .text(position, startX, subY, { width: leftWidth, ...TEXT_SPACING });
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#2d3748')
        .text(location, startX + leftWidth, subY, { width: rightWidth, align: 'right', ...TEXT_SPACING });

      const leftSubHeight = doc.heightOfString(position || '', { width: leftWidth, ...TEXT_SPACING });
      const rightSubHeight = doc.heightOfString(location || '', { width: rightWidth, ...TEXT_SPACING });
      doc.y = subY + Math.max(leftSubHeight, rightSubHeight);

      if (exp.achievements && exp.achievements.length) {
        doc.moveDown(0.1);
        doc.x = startX;
        doc.font('Helvetica').fontSize(10).fillColor('#1a202c');
        doc.list(exp.achievements, startX, undefined, {
          width: getBodyWidth(doc),
          bulletIndent: 8,
          textIndent: 14,
          listType: 'bullet',
          lineGap: 2,
          paragraphGap: 3,
          characterSpacing: TEXT_SPACING.characterSpacing
        });
        doc.x = startX;
      }

      if (index !== data.experience.length - 1) {
        doc.moveDown(0.4);
      }
    });
  });

  sectionSimple(doc, 'Pendidikan', () => {
    const bodyWidth = getBodyWidth(doc);
    const leftWidth = bodyWidth * 0.7;
    const rightWidth = bodyWidth - leftWidth;
    if (!Array.isArray(data.education) || !data.education.length) {
      writeText(doc, 'Belum ada pendidikan.', 10, '#6b7280');
      return;
    }

    data.education.forEach((edu, index) => {
      const institution = edu.institution || 'Nama Universitas / Institusi';
      const year = edu.graduationYear || 'Tahun Lulus';
      const degree = edu.degree || 'Gelar Akademik, Jurusan';
      const gpaText = edu.gpa ? (/ipk/i.test(edu.gpa) ? edu.gpa : `IPK: ${edu.gpa}`) : 'IPK: -';
      const topY = doc.y;

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#1a202c')
        .text(institution, startX, topY, { width: leftWidth, ...TEXT_SPACING });
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#1a202c')
        .text(year, startX + leftWidth, topY, { width: rightWidth, align: 'right', ...TEXT_SPACING });

      const leftHeight = doc.heightOfString(institution || '', { width: leftWidth, ...TEXT_SPACING });
      const rightHeight = doc.heightOfString(year || '', { width: rightWidth, ...TEXT_SPACING });
      doc.y = topY + Math.max(leftHeight, rightHeight);

      const subY = doc.y;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#2d3748')
        .text(degree, startX, subY, { width: leftWidth, ...TEXT_SPACING });
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#2d3748')
        .text(gpaText, startX + leftWidth, subY, { width: rightWidth, align: 'right', ...TEXT_SPACING });

      const leftSubHeight = doc.heightOfString(degree || '', { width: leftWidth, ...TEXT_SPACING });
      const rightSubHeight = doc.heightOfString(gpaText || '', { width: rightWidth, ...TEXT_SPACING });
      doc.y = subY + Math.max(leftSubHeight, rightSubHeight);

      if (index !== data.education.length - 1) {
        doc.moveDown(0.35);
      }
    });
  });

  sectionSimple(doc, 'Keterampilan & Sertifikasi', () => {
    const lines = [];
    if (data.skills && data.skills.length) {
      lines.push({ label: 'Teknikal Skill', text: data.skills.join(', ') });
    }
    if (data.softSkills && data.softSkills.length) {
      lines.push({ label: 'Soft Skill', text: data.softSkills.join(', ') });
    }
    if (data.languages && data.languages.length) {
      lines.push({ label: 'Bahasa', text: data.languages.join(', ') });
    }
    if (data.certifications && data.certifications.length) {
      const certs = data.certifications
        .map((cert) => {
          if (!cert.name) return '';
          const provider = cert.provider ? ` - ${cert.provider}` : '';
          const year = cert.year ? ` (${cert.year})` : '';
          return `${cert.name}${provider}${year}`;
        })
        .filter(Boolean);
      if (certs.length) {
        lines.push({ label: 'Sertifikasi', text: certs.join(', ') });
      }
    }

    if (!lines.length) {
      writeText(doc, 'Belum ada keterampilan.', 10, '#6b7280');
      return;
    }

    lines.forEach((line, idx) => {
      writeLabeledLine(doc, line.label, line.text);
      if (idx !== lines.length - 1) doc.moveDown(0.2);
    });
  });
}

function sectionSimple(doc, title, renderContent) {
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.x = startX;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a202c').text(title.toUpperCase());
  const underlineY = doc.y + 2;
  doc.moveTo(startX, underlineY).lineTo(startX + width, underlineY).lineWidth(1).strokeColor('#1a202c').stroke();
  doc.moveDown(0.6);
  renderContent();
  doc.moveDown(0.8);
}

function sectionBox(doc, title, accentHex, renderContent) {
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.x = startX;

  doc.font('Helvetica-Bold').fontSize(12).fillColor(accentHex).text(title.toUpperCase());
  const headingY = doc.y + 2;
  doc.moveTo(startX, headingY).lineTo(startX + width, headingY).lineWidth(1.5).strokeColor(accentHex).stroke();
  doc.moveDown(0.6);

  renderContent();

  doc.moveDown(0.8);
}

function getBodyWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right - 24;
}

function writeText(doc, text, fontSize = 11, color = '#374151', options = {}) {
  const fontName = options.fontName || 'Helvetica';
  const rest = { ...options };
  delete rest.fontName;
  doc.font(fontName).fontSize(fontSize).fillColor(color).text(text || '', {
    ...TEXT_SPACING,
    width: getBodyWidth(doc),
    ...rest
  });
}

function buildSkillsPlain(data) {
  const lines = [];
  if (data.skills && data.skills.length) {
    lines.push({ label: 'Teknikal Skill:', text: data.skills.join(', ') });
  }
  if (data.softSkills && data.softSkills.length) {
    lines.push({ label: 'Soft Skill:', text: data.softSkills.join(', ') });
  }
  if (data.languages && data.languages.length) {
    lines.push({ label: 'Bahasa:', text: data.languages.join(', ') });
  }
  if (data.certifications && data.certifications.length) {
    const certs = data.certifications
      .filter((c) => c.name)
      .map((c) => {
        const provider = c.provider ? ` - ${c.provider}` : '';
        const year = c.year ? ` (${c.year})` : '';
        return `${c.name}${provider}${year}`;
      });
    if (certs.length) {
      lines.push({ label: 'Sertifikasi:', text: certs.join(', ') });
    }
  }
  if (!lines.length) {
    lines.push({ label: 'Keterampilan:', text: 'Belum ada keterampilan.' });
  }
  return lines;
}

function buildSkillsLines(data) {
  return buildSkillsPlain(data);
}

function writeLineWithDate(doc, leftText, rightText, accentHex) {
  const bodyWidth = getBodyWidth(doc);
  const leftWidth = bodyWidth * 0.68;
  const rightWidth = bodyWidth - leftWidth;
  const startY = doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(accentHex)
    .text(leftText || '', doc.x, startY, { width: leftWidth, ...TEXT_SPACING });

  if (rightText) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#6b7280')
      .text(rightText, doc.x + leftWidth, startY, { width: rightWidth, align: 'right', ...TEXT_SPACING });
  }

  const leftHeight = doc.heightOfString(leftText || '', { width: leftWidth, ...TEXT_SPACING });
  const rightHeight = rightText ? doc.heightOfString(rightText, { width: rightWidth, ...TEXT_SPACING }) : 0;
  doc.y = startY + Math.max(leftHeight, rightHeight);
  doc.moveDown(0.2);
}

function writeLabeledLine(doc, label, value, labelColor = '#1a202c') {
  if (!value) return;
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(labelColor).text(`${label}:`, { continued: true });
  doc.font('Helvetica').fontSize(10.5).fillColor('#1a202c').text(` ${value}`, { ...TEXT_SPACING });
}

function writeMetaLine(doc, text, accentHex) {
  if (!text) return;
  doc.font('Helvetica').fontSize(10).fillColor('#4b5563').text(text, {
    ...TEXT_SPACING,
    width: getBodyWidth(doc)
  });
  doc.moveDown(0.1);
}
