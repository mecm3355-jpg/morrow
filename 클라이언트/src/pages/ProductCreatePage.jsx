import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth } from '../utils/authStorage'
import './ProductCreatePage.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || ''
const CLOUDINARY_WIDGET_URL = 'https://upload-widget.cloudinary.com/latest/global/all.js'
const missingCloudinaryEnv = [
  !CLOUDINARY_CLOUD_NAME && 'VITE_CLOUDINARY_CLOUD_NAME',
  !CLOUDINARY_UPLOAD_PRESET && 'VITE_CLOUDINARY_UPLOAD_PRESET',
].filter(Boolean)
const categories = ['상의', '하의', '악세사리']
const initialForm = {
  name: '',
  sku: '',
  price: '',
  category: '',
  image: '',
  description: '',
}

const navigation = [
  { icon: 'dashboard', label: '대시보드', path: '/admin' },
  { icon: 'order', label: '주문 관리' },
  { icon: 'product', label: '상품 관리', active: true },
  { icon: 'user', label: '고객 관리' },
  { icon: 'megaphone', label: '프로모션' },
  { icon: 'message', label: '리뷰 · 문의' },
  { icon: 'chart', label: '통계' },
]

let cloudinaryWidgetScriptPromise

function loadCloudinaryWidget() {
  if (window.cloudinary?.createUploadWidget) return Promise.resolve(window.cloudinary)
  if (cloudinaryWidgetScriptPromise) return cloudinaryWidgetScriptPromise

  cloudinaryWidgetScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${CLOUDINARY_WIDGET_URL}"]`)
    const script = existingScript || document.createElement('script')

    const handleLoad = () => {
      if (window.cloudinary?.createUploadWidget) resolve(window.cloudinary)
      else {
        script.remove()
        reject(new Error('Cloudinary 위젯을 불러오지 못했습니다.'))
      }
    }
    const handleError = () => {
      script.remove()
      reject(new Error('Cloudinary 위젯을 불러오지 못했습니다.'))
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existingScript) {
      script.src = CLOUDINARY_WIDGET_URL
      script.async = true
      document.head.appendChild(script)
    }
  })

  return cloudinaryWidgetScriptPromise
}

const iconPaths = {
  dashboard: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
  order: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  product: <><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  megaphone: <><path d="m4 13 13-6v10L4 11v2Z" /><path d="M7 14v5h4v-3" /><path d="M20 9v6" /></>,
  message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  chart: <><path d="M5 20v-7M10 20V8M15 20V4M20 20H3" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  upload: <><rect x="3" y="3" width="18" height="16" rx="3" /><path d="m7 15 3.5-4 3 3 2-2 3.5 4" /><circle cx="16" cy="8" r="1.5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  store: <><path d="M4 10v10h16V10M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 4Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A8 8 0 0 0 15 6l-.3-2.6h-4L10.4 6a8 8 0 0 0-1.5.9l-2.4-1-2 3.5 2 1.5a7 7 0 0 0 0 2.1l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.5.9l.3 2.6h4l.3-2.6a8 8 0 0 0 1.5-.9l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-.9Z" /></>,
}

function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  )
}

function ProductCreatePage() {
  const navigate = useNavigate()
  const [auth] = useState(getStoredAuth)
  const [form, setForm] = useState(initialForm)
  const [fileName, setFileName] = useState('')
  const [isWidgetLoading, setIsWidgetLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const uploadWidgetRef = useRef(null)

  const currentUser = auth?.user
  const isAdmin = typeof currentUser?.user_type === 'string'
    && currentUser.user_type.trim().toLowerCase() === 'admin'

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === 'sku' ? value.toUpperCase() : value,
    }))
  }

  async function openUploadWidget() {
    setMessage({ type: '', text: '' })

    if (!auth?.token || !isAdmin) {
      setMessage({ type: 'error', text: '관리자 계정으로 로그인한 뒤 이미지를 업로드해 주세요.' })
      return
    }

    if (missingCloudinaryEnv.length) {
      setMessage({ type: 'error', text: `Cloudinary 환경변수를 설정해 주세요: ${missingCloudinaryEnv.join(', ')}` })
      return
    }

    try {
      setIsWidgetLoading(true)
      const cloudinary = await loadCloudinaryWidget()

      if (!uploadWidgetRef.current) {
        uploadWidgetRef.current = cloudinary.createUploadWidget({
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          sources: ['local', 'url', 'camera'],
          multiple: false,
          resourceType: 'image',
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
          maxImageFileSize: 10 * 1024 * 1024,
        }, (error, result) => {
          if (error) {
            setMessage({ type: 'error', text: '이미지 업로드 중 오류가 발생했습니다.' })
            return
          }

          if (result?.event === 'success' && result.info?.secure_url) {
            const extension = result.info.format ? `.${result.info.format}` : ''
            const uploadedFileName = result.info.original_filename
              ? `${result.info.original_filename}${extension}`
              : result.info.public_id

            setForm((current) => ({ ...current, image: result.info.secure_url }))
            setFileName(uploadedFileName || 'Cloudinary 이미지')
            setMessage({ type: 'success', text: '이미지가 업로드되었습니다. 미리보기를 확인해 주세요.' })
          }
        })
      }

      uploadWidgetRef.current.open()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Cloudinary 위젯을 열지 못했습니다.' })
      cloudinaryWidgetScriptPromise = undefined
    } finally {
      setIsWidgetLoading(false)
    }
  }

  function removeImage() {
    setForm((current) => ({ ...current, image: '' }))
    setFileName('')
    setMessage({ type: '', text: '' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage({ type: '', text: '' })

    if (!auth?.token) {
      setMessage({ type: 'error', text: '상품을 등록하려면 먼저 로그인해 주세요.' })
      return
    }

    if (!isAdmin) {
      setMessage({ type: 'error', text: '관리자만 상품을 등록할 수 있습니다.' })
      return
    }

    if (!form.image) {
      setMessage({ type: 'error', text: '상품 이미지를 등록해 주세요.' })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${auth.tokenType || 'Bearer'} ${auth.token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim(),
          price: Number(form.price),
          category: form.category,
          image: form.image,
          description: form.description.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || '상품 등록에 실패했습니다.')
      }

      setMessage({ type: 'success', text: `${data.name || form.name} 상품을 등록했습니다.` })
      setForm(initialForm)
      setFileName('')
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '서버에 연결할 수 없습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="product-create-page">
      <button className="product-create-mobile-menu" type="button" aria-label="메뉴 열기" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
      {sidebarOpen && <button className="product-create-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}

      <aside className={`product-create-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="product-create-brand">
          <span>m</span><strong>morrow.</strong><small>ADMIN</small>
          <button type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button>
        </div>
        <nav aria-label="관리자 메뉴">
          {navigation.map((item) => (
            <button className={item.active ? 'is-active' : ''} type="button" key={item.label} onClick={() => { if (item.path) navigate(item.path); setSidebarOpen(false) }}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="product-create-sidebar-footer">
          <button type="button" onClick={() => navigate('/')}><Icon name="store" /><span>쇼핑몰 바로가기</span></button>
          <button type="button"><Icon name="settings" /><span>설정</span></button>
        </div>
      </aside>

      <div className="product-create-app">
        <header className="product-create-topbar">
          <label>
            <Icon name="search" size={19} />
            <input type="search" placeholder="상품, 주문, 고객을 검색해 보세요." />
          </label>
          <div className="product-create-account">
            <button type="button" aria-label="알림"><Icon name="bell" size={19} /><i /></button>
            <span className="product-create-avatar">{currentUser?.name?.charAt(0) || '관'}</span>
            <span><strong>{currentUser?.name || '관리자'}</strong><small>{currentUser?.email || 'admin@morrow.kr'}</small></span>
          </div>
        </header>

        <main className="product-create-main">
          <div className="product-create-breadcrumb"><button type="button" onClick={() => navigate('/admin')}>상품 관리</button><span>/</span><strong>상품 등록</strong></div>
          <header className="product-create-heading"><h1>상품 등록</h1><p>새로운 상품 정보를 입력해 주세요.</p></header>

          {message.text && <div className={`product-create-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}

          <form id="product-create-form" className="product-create-form" onSubmit={handleSubmit}>
            <section className="product-create-card product-info-card">
              <h2>기본 정보</h2>
              <div className="product-create-field">
                <label htmlFor="product-name">상품 이름 <b>*</b></label>
                <input id="product-name" name="name" value={form.name} onChange={handleChange} placeholder="상품 이름을 입력해 주세요." maxLength="100" required />
              </div>
              <div className="product-create-field">
                <label htmlFor="product-sku">SKU <b>*</b></label>
                <input id="product-sku" name="sku" value={form.sku} onChange={handleChange} placeholder="예: TOP-001" autoCapitalize="characters" required />
                <small>SKU는 상품마다 고유해야 하며 영문과 숫자 조합을 권장합니다.</small>
              </div>
              <div className="product-create-field">
                <label htmlFor="product-price">상품 가격 <b>*</b></label>
                <div className="product-price-input"><input id="product-price" name="price" type="number" value={form.price} onChange={handleChange} placeholder="0" min="0" step="1" required /><span>원</span></div>
              </div>
              <div className="product-create-field">
                <label htmlFor="product-category">카테고리 <b>*</b></label>
                <select id="product-category" name="category" value={form.category} onChange={handleChange} required>
                  <option value="">카테고리를 선택해 주세요.</option>
                  {categories.map((category) => <option value={category} key={category}>{category}</option>)}
                </select>
              </div>
              <div className="product-create-field">
                <label htmlFor="product-description">상품 설명 <span>(선택)</span></label>
                <textarea id="product-description" name="description" value={form.description} onChange={handleChange} placeholder="상품에 대한 자세한 설명을 입력해 주세요." maxLength="2000" rows="5" />
                <small className="product-description-count">{form.description.length} / 2,000</small>
              </div>
            </section>

            <section className="product-create-card product-image-card">
              <h2>상품 이미지</h2>
              <button className="product-image-dropzone" type="button" onClick={openUploadWidget} disabled={isWidgetLoading}>
                <span className="product-upload-icon"><Icon name="upload" size={48} /><i><Icon name="plus" size={18} /></i></span>
                <strong>{isWidgetLoading ? 'Cloudinary 위젯을 불러오는 중...' : 'Cloudinary 위젯으로 이미지 업로드'}</strong>
                <small>JPG, PNG, WEBP · 최대 10MB</small>
              </button>

              {form.image ? (
                <div className="product-image-preview">
                  <img src={form.image} alt="등록할 상품 미리보기" />
                  <div><strong>{fileName}</strong><small>대표 이미지</small></div>
                  <button type="button" onClick={removeImage}>삭제</button>
                </div>
              ) : <div className="product-image-empty" aria-hidden="true" />}
            </section>
          </form>
        </main>

        <footer className="product-create-actions">
          <button type="button" onClick={() => navigate('/admin')}>취소</button>
          <button type="submit" form="product-create-form" disabled={isSubmitting}>{isSubmitting ? '등록 중...' : '상품 등록'}</button>
        </footer>
      </div>
    </div>
  )
}

export default ProductCreatePage
