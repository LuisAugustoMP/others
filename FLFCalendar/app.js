/* ============================================
   FLF Calendar — Main Application
   Faculdade Luciano Feijão
   ============================================ */

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const FLF_ARQUITETURA_COURSES = {
  1: [
    "Fund. Arquitetura e Urbanismo",
    "Desenho Arquitetônico I",
    "Estudos Sociais, Econ. e Amb.",
    "Estética e História da Arte",
    "Análise e Comp. da Forma",
    "Geometria Descritiva",
    "Fundamentos Antropológicos",
    "Metodologia Científica"],
  2: [
    "Fund. Arquitetura e Urbanismo",
    "Desenho Arquitetônico I",
    "Estudos Sociais, Econ. e Amb.",
    "Estética e História da Arte",
    "Análise e Comp. da Forma",
    "Geometria Descritiva",
    "Legislação Urbana",
    "Metodologia Científica"],
  3: [
    "Conforto Ambiental I",
    "Materiais e Téc. Construtivas",
    "Ateliê de Arquitetura II",
    "Teoria e Hist. da Arquitetura e Urb. II",
    "Informática Aplic. Arquitetura e Urb. I",
    "Tópico de Extensão I",
    "Legislação Urbana"],
  4: [
    "Tópico de Extensão II",
    "Ateliê de Arquitetura III",
    "Conforto Ambiental II",
    "Informática Aplic. Arquitetura e Urb. II",
    "Teoria e Hist. da Arquitetura e Urb. III",
    "Psicologia Ambiental",
    "Estúdio Urbano II",
    "Desenho Universal"],
  5: [
    "Tópico de Extensão III",
    "Resistência e Estab. das Estruturas",
    "Informática Aplic. Arquitetura e Urb. III",
    "Design do Objeto",
    "Ateliê de Arquitetura IV",
    "Conforto Ambiental III",
    "Estúdio Urbano III",
    "Teoria e Hist. da Arq. e Urb. no Brasil"],
  6: [
    "Sistemas Estruturais II",
    "Ateliê de Arquitetura V",
    "Tópico de Extensão IV",
    "Estúdio Urbano IV",
    "Paisagismo I",
    "Patrimônio Cultural e Restauro",
    "Instalações Prediais I"],
  7: [
    "Tópico de Extensão V",
    "Técnicas Retrospectivas",
    "Ateliê Integrado I",
    "Estúdio Urbano V",
    "Paisagismo II",
    "Sistemas Estruturais III",
    "Teoria e Hist. da Arq. e Urb. no Ceará"],
  8: [
    "Estágio Supervisionado I",
    "Arquitetura de Interiores",
    "Tópico de Extensão VI",
    "Ateliê Integrado II",
    "Gestão de Obras",
    "Planejamento de Carreira"],
  9: [
    "Estágio Supervisionado II",
    "TCC I",
    "Gestão de Obras",
    "Planejamento de Carreira"],
  10: [
    "Libras",
    "Inglês",
    "Optativa I"]
};

// ============================================
// PDFParser — Extracts raw text from all pages
// ============================================
const PDFParser = {
  async parse(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      pages.push({
        items: content.items,
        text: content.items.map(item => item.str).join(' ')
      });
      UIController.updateProgress(Math.round((i / pdf.numPages) * 40));
    }
    return pages;
  }
};

// ============================================
// SemesterExtractor — Identifies semesters
// ============================================
const SemesterExtractor = {
  extract(pages) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }
};

// ============================================
// CourseExtractor — Extracts courses per semester
// ============================================
const CourseExtractor = {
  extract(pages, semesters) {
    const coursesBySemester = {};
    for (const sem of semesters) {
      coursesBySemester[sem] = [];
      const courseNames = FLF_ARQUITETURA_COURSES[sem] || [];
      for (const name of courseNames) {
        coursesBySemester[sem].push({
          name,
          dayOfWeek: null,
          startTime: '19:00',
          endTime: '20:40'
        });
      }
    }
    UIController.updateProgress(70);
    return coursesBySemester;
  }
};

// ============================================
// ExamExtractor — Finds exam dates
// ============================================
const ExamExtractor = {
  extract(pages, coursesBySemester) {
    const exams = {};

    const allCourses = [];
    for (const [sem, courses] of Object.entries(coursesBySemester)) {
      for (const course of courses) {
        allCourses.push({ ...course, semester: parseInt(sem) });
        exams[course.name] = { semester: parseInt(sem), ap1: null, ap2: null };
      }
    }

    const datePattern = /\((\d{2}\/\d{2})\)/;

    for (const page of pages) {
      const isap1 = page.text.includes('1ª Avaliação Parcial');
      const isap2 = page.text.includes('2ª Avaliação Parcial') && !page.text.includes('Chamada');

      if (!isap1 && !isap2) continue;

      const dates = [];
      for (const item of page.items) {
        const match = item.str.match(datePattern);
        if (match) {
          dates.push({
            date: match[1] + '/2026',
            x: item.transform[4]
          });
        }
      }

      for (const d of dates) {
        const columnItems = page.items.filter(item => Math.abs(item.transform[4] - d.x) < 40);
        const columnText = columnItems.map(item => item.str).join(' ');

        for (const course of allCourses) {
          if (this._isCourseInText(course.name, columnText)) {
            if (isap1 && !exams[course.name].ap1) {
              exams[course.name].ap1 = { date: d.date, startTime: '19:00', endTime: '20:40' };
            } else if (isap2 && !exams[course.name].ap2) {
              exams[course.name].ap2 = { date: d.date, startTime: '19:00', endTime: '20:40' };
            }
          }
        }
      }
    }

    UIController.updateProgress(90);
    return exams;
  },

  _isCourseInText(courseName, text) {
    const normCourse = this._normalize(courseName);
    const normText = this._normalize(text);

    if (normText.includes(normCourse)) return true;

    const words = normCourse.split(' ').filter(w => w.length >= 4);
    if (words.length === 0) return false;

    let matchCount = 0;
    for (const w of words) {
      if (normText.includes(w)) matchCount++;
    }
    return matchCount / words.length >= 0.75;
  },

  _normalize(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .trim();
  }
};

// ============================================
// ICSGenerator — Creates .ICS file content
// ============================================
const ICSGenerator = {
  /**
   * Generate ICS content for selected courses
   * @param {string[]} selectedCourses - Array of course names
   * @param {Object} exams - Exam data from ExamExtractor
   * @returns {string} ICS file content
   */
  generate(selectedCourses, exams) {
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FLF Calendar//Gerador de Provas//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Provas FLF 2026.1',
      'X-WR-TIMEZONE:America/Fortaleza',
      // Timezone definition
      'BEGIN:VTIMEZONE',
      'TZID:America/Fortaleza',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0300',
      'TZOFFSETTO:-0300',
      'TZNAME:BRT',
      'END:STANDARD',
      'END:VTIMEZONE',
    ];

    let eventCount = 0;

    for (const courseName of selectedCourses) {
      const examData = exams[courseName];
      if (!examData) continue;

      // AP1 Event
      if (examData.ap1) {
        const event = this._createEvent(
          courseName,
          'AP1',
          '1ª Avaliação Parcial',
          examData.ap1
        );
        ics.push(...event);
        eventCount++;
      }

      // AP2 Event
      if (examData.ap2) {
        const event = this._createEvent(
          courseName,
          'AP2',
          '2ª Avaliação Parcial',
          examData.ap2
        );
        ics.push(...event);
        eventCount++;
      }
    }

    ics.push('END:VCALENDAR');

    return { content: ics.join('\r\n'), eventCount };
  },

  _createEvent(courseName, type, fullType, examInfo) {
    const { date, startTime, endTime } = examInfo;

    // Parse date DD/MM/YYYY
    const parts = date.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];

    // Parse times
    const [startH, startM] = startTime.split(':');
    const [endH, endM] = endTime.split(':');

    const dtStart = `${year}${month}${day}T${startH.padStart(2, '0')}${startM}00`;
    const dtEnd = `${year}${month}${day}T${endH.padStart(2, '0')}${endM}00`;

    // Create UID
    const uid = `${type.toLowerCase()}-${this._slug(courseName)}-${year}${month}${day}@flf-calendar`;

    // Timestamp
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    // Alarm: 30 minutes before
    const alarm = [
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Prova em 30 minutos: [${type}] ${courseName}`,
      'END:VALARM',
    ];

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=America/Fortaleza:${dtStart}`,
      `DTEND;TZID=America/Fortaleza:${dtEnd}`,
      `SUMMARY:[${type}] ${courseName}`,
      `DESCRIPTION:Faculdade Luciano Feijão\\nCalendário Acadêmico\\n\\nDisciplina:\\n${courseName}\\n\\nTipo:\\n${fullType}`,
      'LOCATION:Faculdade Luciano Feijão',
      'STATUS:CONFIRMED',
      ...alarm,
      'END:VEVENT',
    ];
  },

  _slug(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  },

  /**
   * Download the ICS file
   * @param {string} content
   */
  download(content) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provas-flf-2026-1.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// ============================================
// SearchController — Search and filter
// ============================================
const SearchController = {
  _normalizeSearch(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  },

  filter(items, query) {
    if (!query || query.trim() === '') return items;

    const normalizedQuery = this._normalizeSearch(query);

    return items.filter(item => {
      const normalizedName = this._normalizeSearch(item.name);
      const normalizedSemester = this._normalizeSearch(`${item.semester}º`);
      return normalizedName.includes(normalizedQuery) ||
        normalizedSemester.includes(normalizedQuery) ||
        this._normalizeSearch(`${item.semester}º ${item.name}`).includes(normalizedQuery);
    });
  }
};

// ============================================
// UIController — Manages all UI interactions
// ============================================
const UIController = {
  // State
  _currentStep: 1,
  _pdfData: null,       // Parsed data from PDF
  _selectedCourses: new Set(),
  _allCourses: [],       // Flat list of { semester, name, ... }
  _exams: {},
  _coursesBySemester: {},

  // ---- Initialize ----
  init() {
    this._bindUpload();
    this._bindTabs();
    this._bindSearch();
    this._bindButtons();
    this._bindKeyboard();
  },

  // ---- Step Navigation ----
  goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));

    // Update step dots
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`step-dot-${i}`);
      const line = document.getElementById(`step-line-${i}`);

      dot.classList.remove('active', 'completed');
      dot.setAttribute('aria-selected', 'false');

      if (i < step) {
        dot.classList.add('completed');
        dot.innerHTML = '<i class="fa-solid fa-check" style="font-size: 12px;"></i>';
      } else if (i === step) {
        dot.classList.add('active');
        dot.textContent = i;
        dot.setAttribute('aria-selected', 'true');
      } else {
        dot.textContent = i;
      }

      if (line) {
        line.classList.toggle('completed', i < step);
      }
    }

    // Show target step
    const stepMap = { 1: 'step-upload', 2: 'step-loading', 3: 'step-selection', 4: 'step-preview', 5: 'step-success' };
    const targetEl = document.getElementById(stepMap[step]);
    if (targetEl) {
      targetEl.classList.add('active');
    }

    // Handle step 5 (success — keep dots at step 4 completed)
    if (step === 5) {
      for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`step-dot-${i}`);
        dot.classList.remove('active');
        dot.classList.add('completed');
        dot.innerHTML = '<i class="fa-solid fa-check" style="font-size: 12px;"></i>';
        const line = document.getElementById(`step-line-${i}`);
        if (line) line.classList.add('completed');
      }
    }

    this._currentStep = step;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ---- Upload Binding ----
  _bindUpload() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('upload-input');

    // Click to upload
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });

    // File selected
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this._handleFile(file);
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this._handleFile(file);
    });
  },

  // ---- Handle File ----
  async _handleFile(file) {
    if (file.type !== 'application/pdf') {
      this.showToast('Por favor, selecione um arquivo PDF.', 'error');
      return;
    }

    // Go to loading
    this.goToStep(2);
    this.updateProgress(0);
    this._updateLoadingText('Analisando documento...', 'Carregando páginas do PDF');

    try {
      // Parse PDF
      const pages = await PDFParser.parse(file);
      this._updateLoadingText('Extraindo semestres...', 'Identificando períodos acadêmicos');
      this.updateProgress(45);

      // Extract semesters
      const semesters = SemesterExtractor.extract(pages);

      if (semesters.length === 0) {
        throw new Error('NO_SEMESTERS');
      }

      this._updateLoadingText('Extraindo disciplinas...', 'Identificando cursos e horários');
      this.updateProgress(55);

      // Extract courses
      const coursesBySemester = CourseExtractor.extract(pages, semesters);
      this._coursesBySemester = coursesBySemester;

      // Build flat course list
      this._allCourses = [];
      for (const [sem, courses] of Object.entries(coursesBySemester)) {
        for (const course of courses) {
          this._allCourses.push({ ...course, semester: parseInt(sem) });
        }
      }

      if (this._allCourses.length === 0) {
        throw new Error('NO_COURSES');
      }

      this._updateLoadingText('Identificando avaliações...', 'Localizando datas de provas');
      this.updateProgress(80);

      // Extract exams
      this._exams = ExamExtractor.extract(pages, coursesBySemester);
      this.updateProgress(100);

      // Store parsed data
      this._pdfData = { pages, semesters, coursesBySemester, exams: this._exams };

      // Small delay to show 100%
      await this._delay(500);

      // Build selection UI
      this._buildSemesterGrid(semesters, coursesBySemester);
      this._buildDisciplineList();

      // Go to selection
      this.goToStep(3);
      this.showToast(`${this._allCourses.length} disciplinas encontradas!`, 'success');

    } catch (error) {
      console.error('PDF parsing error:', error);

      if (error.message === 'NO_SEMESTERS' || error.message === 'NO_COURSES') {
        this._showError();
      } else {
        this._showError();
      }
    }
  },

  _showError() {
    // Go back to step 1 with error message
    this.goToStep(1);
    this.showToast('Não foi possível identificar a estrutura acadêmica deste PDF. Verifique se você enviou um calendário oficial da Faculdade Luciano Feijão.', 'error');
  },

  _updateLoadingText(main, sub) {
    document.getElementById('loading-text').textContent = main;
    document.getElementById('loading-subtext').textContent = sub;
  },

  updateProgress(percent) {
    const fill = document.getElementById('loading-progress');
    fill.style.width = `${percent}%`;
    fill.closest('.loading-progress-bar').setAttribute('aria-valuenow', percent);
  },

  // ---- Build Semester Grid ----
  _buildSemesterGrid(semesters, coursesBySemester) {
    const grid = document.getElementById('semester-grid');
    grid.innerHTML = '';

    for (const sem of semesters) {
      const count = (coursesBySemester[sem] || []).length;
      const card = document.createElement('div');
      card.className = 'semester-card';
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('aria-label', `${sem}º Semestre - ${count} disciplinas`);
      card.setAttribute('tabindex', '0');
      card.dataset.semester = sem;

      card.innerHTML = `
        <div class="semester-checkbox"><i class="fa-solid fa-check" aria-hidden="true"></i></div>
        <div>
          <div class="semester-card-label">${sem === 10 ? 'Optativas' : sem + 'º Semestre'}</div>
          <div class="semester-card-count">${count} disciplina${count !== 1 ? 's' : ''}</div>
        </div>
      `;

      card.addEventListener('click', () => this._toggleSemester(sem, card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleSemester(sem, card);
        }
      });

      grid.appendChild(card);
    }
  },

  _toggleSemester(sem, card) {
    const courses = this._coursesBySemester[sem] || [];
    const isSelected = card.classList.contains('selected');

    if (isSelected) {
      // Deselect all courses in this semester
      for (const course of courses) {
        this._selectedCourses.delete(course.name);
      }
      card.classList.remove('selected');
      card.setAttribute('aria-checked', 'false');
    } else {
      // Select all courses in this semester
      for (const course of courses) {
        this._selectedCourses.add(course.name);
      }
      card.classList.add('selected');
      card.setAttribute('aria-checked', 'true');
    }

    this._updateSelectionUI();
  },

  // ---- Build Discipline List ----
  _buildDisciplineList(filter = '') {
    const list = document.getElementById('discipline-list');
    list.innerHTML = '';

    let courses = this._allCourses.map(c => ({
      ...c,
      searchKey: `${c.semester}º ${c.name}`
    }));

    if (filter) {
      courses = SearchController.filter(courses, filter);
    }

    if (courses.length === 0) {
      list.innerHTML = `
        <div class="discipline-empty">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          Nenhuma disciplina encontrada
        </div>
      `;
      return;
    }

    // Sort by semester then name
    courses.sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name, 'pt-BR'));

    for (const course of courses) {
      const item = document.createElement('div');
      item.className = 'discipline-item';
      if (this._selectedCourses.has(course.name)) {
        item.classList.add('selected');
      }
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', this._selectedCourses.has(course.name));
      item.setAttribute('tabindex', '0');
      item.dataset.course = course.name;
      item.dataset.semester = course.semester;

      item.innerHTML = `
        <div class="discipline-checkbox"><i class="fa-solid fa-check" aria-hidden="true"></i></div>
        <span class="discipline-semester-badge">${course.semester === 10 ? 'OPT' : course.semester + 'º'}</span>
        <span class="discipline-name">${course.name}</span>
      `;

      item.addEventListener('click', () => this._toggleDiscipline(course.name, item));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._toggleDiscipline(course.name, item);
        }
      });

      list.appendChild(item);
    }
  },

  _toggleDiscipline(courseName, item) {
    if (this._selectedCourses.has(courseName)) {
      this._selectedCourses.delete(courseName);
      item.classList.remove('selected');
      item.setAttribute('aria-selected', 'false');
    } else {
      this._selectedCourses.add(courseName);
      item.classList.add('selected');
      item.setAttribute('aria-selected', 'true');
    }

    // Update semester cards
    this._syncSemesterCards();
    this._updateSelectionUI();
  },

  _syncSemesterCards() {
    const cards = document.querySelectorAll('.semester-card');
    for (const card of cards) {
      const sem = parseInt(card.dataset.semester);
      const courses = this._coursesBySemester[sem] || [];
      const allSelected = courses.length > 0 && courses.every(c => this._selectedCourses.has(c.name));
      card.classList.toggle('selected', allSelected);
      card.setAttribute('aria-checked', allSelected.toString());
    }
  },

  _updateSelectionUI() {
    const count = this._selectedCourses.size;

    // Update count
    document.getElementById('selection-count-text').textContent =
      `${count} selecionada${count !== 1 ? 's' : ''}`;

    // Update continue button
    document.getElementById('btn-continue').disabled = count === 0;

    // Update chips
    this._buildChips();

    // Sync discipline list checkmarks
    const items = document.querySelectorAll('.discipline-item');
    for (const item of items) {
      const isSelected = this._selectedCourses.has(item.dataset.course);
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', isSelected.toString());
    }
  },

  _buildChips() {
    const container = document.getElementById('selected-chips');
    container.innerHTML = '';

    for (const courseName of this._selectedCourses) {
      const course = this._allCourses.find(c => c.name === courseName);
      if (!course) continue;

      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `
        <span>${course.semester === 10 ? 'OPT' : course.semester + 'º'} ${course.name}</span>
        <button class="chip-remove" aria-label="Remover ${course.name}" title="Remover">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;

      chip.querySelector('.chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectedCourses.delete(courseName);
        this._syncSemesterCards();
        this._updateSelectionUI();
      });

      container.appendChild(chip);
    }
  },

  // ---- Tabs ----
  _bindTabs() {
    const tabs = document.querySelectorAll('.selection-tab');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Show corresponding panel
        document.querySelectorAll('.selection-panel').forEach(p => p.classList.remove('active'));
        const panelId = `panel-${tab.dataset.tab}`;
        document.getElementById(panelId).classList.add('active');
      });
    });
  },

  // ---- Search ----
  _bindSearch() {
    const input = document.getElementById('search-input');
    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this._buildDisciplineList(input.value);
      }, 200);
    });
  },

  // ---- Buttons ----
  _bindButtons() {
    // Continue to preview
    document.getElementById('btn-continue').addEventListener('click', () => {
      this._buildPreview();
      this.goToStep(4);
    });

    // Back to upload
    document.getElementById('btn-back-upload').addEventListener('click', () => {
      this._reset();
      this.goToStep(1);
    });

    // Back to selection
    document.getElementById('btn-back-selection').addEventListener('click', () => {
      this.goToStep(3);
    });

    // Export
    document.getElementById('btn-export').addEventListener('click', () => {
      this._exportICS();
    });

    // Restart
    document.getElementById('btn-restart').addEventListener('click', () => {
      this._reset();
      this.goToStep(1);
    });
  },

  // ---- Build Preview ----
  _buildPreview() {
    const container = document.getElementById('exam-cards');
    container.innerHTML = '';

    const selectedArray = Array.from(this._selectedCourses);
    let totalExams = 0;

    for (let i = 0; i < selectedArray.length; i++) {
      const courseName = selectedArray[i];
      const examData = this._exams[courseName];
      if (!examData) continue;

      const card = document.createElement('div');
      card.className = 'exam-card';
      card.style.animationDelay = `${i * 0.06}s`;

      const semester = examData.semester || '?';

      let bodyHTML = '<div class="exam-card-body">';

      if (examData.ap1) {
        totalExams++;
        bodyHTML += `
          <div class="exam-entry">
            <div class="exam-entry-type ap1">ap1</div>
            <div class="exam-entry-date">
              <i class="fa-solid fa-calendar-day" aria-hidden="true"></i>
              ${examData.ap1.date}
            </div>
            <div class="exam-entry-time">
              <i class="fa-solid fa-clock" aria-hidden="true"></i>
              ${examData.ap1.startTime} às ${examData.ap1.endTime}
            </div>
          </div>
        `;
      } else {
        bodyHTML += `
          <div class="exam-entry">
            <div class="exam-entry-type ap1">ap1</div>
            <div class="exam-entry-date" style="color: var(--flf-text-muted);">
              <i class="fa-solid fa-circle-question" aria-hidden="true"></i>
              Não encontrada
            </div>
          </div>
        `;
      }

      if (examData.ap2) {
        totalExams++;
        bodyHTML += `
          <div class="exam-entry">
            <div class="exam-entry-type ap2">ap2</div>
            <div class="exam-entry-date">
              <i class="fa-solid fa-calendar-day" aria-hidden="true"></i>
              ${examData.ap2.date}
            </div>
            <div class="exam-entry-time">
              <i class="fa-solid fa-clock" aria-hidden="true"></i>
              ${examData.ap2.startTime} às ${examData.ap2.endTime}
            </div>
          </div>
        `;
      } else {
        bodyHTML += `
          <div class="exam-entry">
            <div class="exam-entry-type ap2">ap2</div>
            <div class="exam-entry-date" style="color: var(--flf-text-muted);">
              <i class="fa-solid fa-circle-question" aria-hidden="true"></i>
              Não encontrada
            </div>
          </div>
        `;
      }

      bodyHTML += '</div>';

      card.innerHTML = `
        <div class="exam-card-header">
          <div class="exam-card-icon">
            <i class="fa-solid fa-book-open" aria-hidden="true"></i>
          </div>
          <div class="exam-card-title">${courseName}</div>
          <span class="exam-card-semester">${semester}º</span>
        </div>
        ${bodyHTML}
      `;

      container.appendChild(card);
    }

    // Update stats
    document.getElementById('stat-disciplines-text').textContent =
      `${selectedArray.length} disciplina${selectedArray.length !== 1 ? 's' : ''}`;
    document.getElementById('stat-exams-text').textContent =
      `${totalExams} prova${totalExams !== 1 ? 's' : ''}`;
  },

  // ---- Export ICS ----
  _exportICS() {
    const selectedArray = Array.from(this._selectedCourses);

    if (selectedArray.length === 0) {
      this.showToast('Nenhuma disciplina selecionada.', 'error');
      return;
    }

    const { content, eventCount } = ICSGenerator.generate(selectedArray, this._exams);

    if (eventCount === 0) {
      this.showToast('Nenhuma data de prova foi encontrada para as disciplinas selecionadas.', 'error');
      return;
    }

    ICSGenerator.download(content);

    this.showToast(`Arquivo ICS gerado com ${eventCount} evento${eventCount !== 1 ? 's' : ''}!`, 'success');

    // Go to success
    this.goToStep(5);
  },

  // ---- Reset ----
  _reset() {
    this._pdfData = null;
    this._selectedCourses = new Set();
    this._allCourses = [];
    this._exams = {};
    this._coursesBySemester = {};

    // Clear file input
    document.getElementById('upload-input').value = '';

    // Clear dynamic content
    document.getElementById('semester-grid').innerHTML = '';
    document.getElementById('discipline-list').innerHTML = '';
    document.getElementById('selected-chips').innerHTML = '';
    document.getElementById('exam-cards').innerHTML = '';
    document.getElementById('search-input').value = '';

    // Reset count
    document.getElementById('selection-count-text').textContent = '0 selecionadas';
    document.getElementById('btn-continue').disabled = true;
  },

  // ---- Keyboard Navigation ----
  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Escape to go back
      if (e.key === 'Escape') {
        if (this._currentStep === 3) {
          this._reset();
          this.goToStep(1);
        } else if (this._currentStep === 4) {
          this.goToStep(3);
        }
      }
    });
  },

  // ---- Toast Notifications ----
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');

    const icons = {
      success: 'fa-solid fa-circle-check',
      error: 'fa-solid fa-circle-exclamation',
      info: 'fa-solid fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <i class="${icons[type]}" aria-hidden="true"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // ---- Utility ----
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  UIController.init();
});
