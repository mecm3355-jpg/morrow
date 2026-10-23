import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProductFrameImage from '../../components/ProductFrameImage'
import { getStoredAuth } from '../../utils/authStorage'
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
  spinImages: [],
  description: '',
}

const navigation = [
  { icon: 'dashboard', label: '대시보드', path: '/admin' },
  { icon: 'order', label: '주문 관리', path: '/admin/orders' },
  { icon: 'product', label: '상품 관리', path: '/admin/products', active: true },
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
  const { productId } = useParams()
  const isEditing = Boolean(productId)
  const [auth] = useState(getStoredAuth)
  const [form, setForm] = useState(initialForm)
  const [fileName, setFileName] = useState('')
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditing)
  const [didProductLoadFail, setDidProductLoadFail] = useState(false)
  const [isWidgetLoading, setIsWidgetLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const uploadWidgetRef = useRef(null)
  const spinUploadWidgetRef = useRef(null)
  const spinUploadBatchRef = useRef([])

  const currentUser = auth?.user
  const isAdmin = typeof currentUser?.user_type === 'string'
    && currentUser.user_type.trim().toLowerCase() === 'admin'

  useEffect(() => {
    if (!productId) return undefined

    const controller = new AbortController()

    async function loadProduct() {
      try {
        const response = await fetch(`${API_URL}/api/products/${productId}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        const product = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(product.message || '상품 정보를 불러오지 못했습니다.')

        setForm({
          name: product.name || '',
          sku: product.sku || '',
          price: Number.isFinite(Number(product.price)) ? String(product.price) : '',
          category: product.category || '',
          image: product.image || '',
          spinImages: Array.isArray(product.spinImages) ? product.spinImages.filter(Boolean) : [],
          description: product.description || '',
        })
        setDidProductLoadFail(false)
        setFileName(product.image ? '현재 등록된 상품 이미지' : '')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setDidProductLoadFail(true)
          setMessage({ type: 'error', text: error.message || '서버에 연결할 수 없습니다.' })
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingProduct(false)
      }
    }

    loadProduct()
    return () => controller.abort()
  }, [productId])

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

  async function openSpinUploadWidget() {
    setMessage({ type: '', text: '' })

    if (!auth?.token || !isAdmin) {
      setMessage({ type: 'error', text: '관리자 계정으로 로그인한 뒤 이미지를 업로드해 주세요.' })
      return
    }

    if (missingCloudinaryEnv.length) {
      setMessage({ type: 'error', text: `Cloudinary 환경변수를 설정해 주세요: ${missingCloudinaryEnv.join(', ')}` })
      return
    }

    if (form.spinImages.length >= 48) {
      setMessage({ type: 'error', text: '360도 이미지는 최대 48장까지 등록할 수 있습니다.' })
      return
    }

    try {
      setIsWidgetLoading(true)
      const cloudinary = await loadCloudinaryWidget()

      if (!spinUploadWidgetRef.current) {
        spinUploadWidgetRef.current = cloudinary.createUploadWidget({
          cloudName: CLOUDINARY_CLOUD_NAME,
          uploadPreset: CLOUDINARY_UPLOAD_PRESET,
          sources: ['local', 'url'],
          multiple: true,
          maxFiles: 48,
          resourceType: 'image',
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
          maxImageFileSize: 10 * 1024 * 1024,
        }, (error, result) => {
          if (error) {
            setMessage({ type: 'error', text: '360도 이미지 업로드 중 오류가 발생했습니다.' })
            return
          }

          if (result?.event === 'success' && result.info?.secure_url) {
            spinUploadBatchRef.current.push({
              name: result.info.original_filename || result.info.public_id || '',
              url: result.info.secure_url,
            })
          }

          if (result?.event === 'queues-end' && spinUploadBatchRef.current.length) {
            const uploadedImages = [...spinUploadBatchRef.current]
              .sort((first, second) => first.name.localeCompare(second.name, undefined, { numeric: true }))
              .map((item) => item.url)

            setForm((current) => ({
              ...current,
              spinImages: [...new Set([...current.spinImages, ...uploadedImages])].slice(0, 48),
            }))
            setMessage({ type: 'success', text: `${uploadedImages.length}장의 360도 프레임을 추가했습니다.` })
            spinUploadBatchRef.current = []
          }
        })
      }

      spinUploadBatchRef.current = []
      spinUploadWidgetRef.current.open()
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

  function removeSpinImage(indexToRemove) {
    setForm((current) => ({
      ...current,
      spinImages: current.spinImages.filter((_, index) => index !== indexToRemove),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage({ type: '', text: '' })

    if (!auth?.token) {
      setMessage({ type: 'error', text: `상품을 ${isEditing ? '수정' : '등록'}하려면 먼저 로그인해 주세요.` })
      return
    }

    if (didProductLoadFail) {
      setMessage({ type: 'error', text: '상품 정보를 다시 불러온 뒤 수정해 주세요.' })
      return
    }

    if (!isAdmin) {
      setMessage({ type: 'error', text: `관리자만 상품을 ${isEditing ? '수정' : '등록'}할 수 있습니다.` })
      return
    }

    if (!form.image) {
      setMessage({ type: 'error', text: '상품 이미지를 등록해 주세요.' })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`${API_URL}/api/products${isEditing ? `/${productId}` : ''}`, {
        method: isEditing ? 'PATCH' : 'POST',
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
          spinImages: form.spinImages,
          description: form.description.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || `상품 ${isEditing ? '수정' : '등록'}에 실패했습니다.`)
      }

      navigate('/admin/products', {
        replace: true,
        state: { notice: `${data.name || form.name} 상품을 ${isEditing ? '수정' : '등록'}했습니다.` },
      })
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
          <button className="product-create-brand-link" type="button" onClick={() => navigate('/admin')} aria-label="관리자 대시보드로 이동">
            <span>m</span><strong>morrow.</strong>
          </button>
          <small>ADMIN</small>
          <button className="product-create-sidebar-close" type="button" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button>
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
            <input type="search" placeholder="상품명 또는 SKU를 검색해 보세요." />
          </label>
          <div className="product-create-account">
            <button type="button" aria-label="알림"><Icon name="bell" size={19} /><i /></button>
            <span className="product-create-avatar">{currentUser?.name?.charAt(0) || '관'}</span>
            <span><strong>{currentUser?.name || '관리자'}</strong><small>{currentUser?.email || 'admin@morrow.kr'}</small></span>
          </div>
        </header>

        <main className="product-create-main">
          <div className="product-create-breadcrumb"><button type="button" onClick={() => navigate('/admin/products')}>상품 관리</button><span>/</span><strong>{isEditing ? '상품 수정' : '상품 등록'}</strong></div>
          <header className="product-create-heading"><h1>{isEditing ? '상품 수정' : '상품 등록'}</h1><p>{isEditing ? '등록된 상품 정보를 확인하고 필요한 내용을 변경해 주세요.' : '새로운 상품 정보를 입력해 주세요.'}</p></header>

          {message.text && <div className={`product-create-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}
          {isLoadingProduct ? <div className="product-create-message loading" role="status">상품 정보를 불러오고 있습니다.</div> : null}

          <form id="product-create-form" className="product-create-form" onSubmit={handleSubmit}>
            <section className="product-create-card product-info-card">
              <h2>기본 정보</h2>
              <div className="product-create-field">
                <label htmlFor="product-name">상품 이름 <b>*</b></label>
                <input id="product-name" name="name" value={form.name} onChange={handleChange} placeholder="상품 이름을 입력해 주세요." maxLength="100" disabled={isLoadingProduct} required />
              </div>
              <div className="product-create-field">
                <label htmlFor="product-sku">SKU <b>*</b></label>
                <input id="product-sku" name="sku" value={form.sku} onChange={handleChange} placeholder="예: TOP-001" autoCapitalize="characters" disabled={isLoadingProduct} required />
                <small>SKU는 상품마다 고유해야 하며 영문과 숫자 조합을 권장합니다.</small>
              </div>
              <div className="product-create-field">
                <label htmlFor="product-price">상품 가격 <b>*</b></label>
                <div className="product-price-input"><input id="product-price" name="price" type="number" value={form.price} onChange={handleChange} placeholder="0" min="0" step="1" disabled={isLoadingProduct} required /><span>원</span></div>
              </div>
              <div className="product-create-field">
                <label htmlFor="product-category">카테고리 <b>*</b></label>
                <select id="product-category" name="category" value={form.category} onChange={handleChange} disabled={isLoadingProduct} required>
                  <option value="">카테고리를 선택해 주세요.</option>
                  {categories.map((category) => <option value={category} key={category}>{category}</option>)}
                </select>
              </div>
              <div className="product-create-field">
                <label htmlFor="product-description">상품 설명 <span>(선택)</span></label>
                <textarea id="product-description" name="description" value={form.description} onChange={handleChange} placeholder="상품에 대한 자세한 설명을 입력해 주세요." maxLength="2000" rows="5" disabled={isLoadingProduct} />
                <small className="product-description-count">{form.description.length} / 2,000</small>
              </div>
            </section>

            <section className="product-create-card product-image-card">
              <h2>상품 이미지</h2>
              <button className="product-image-dropzone" type="button" onClick={openUploadWidget} disabled={isWidgetLoading || isLoadingProduct}>
                <span className="product-upload-icon"><Icon name="upload" size={48} /><i><Icon name="plus" size={18} /></i></span>
                <strong>{isWidgetLoading ? 'Cloudinary 위젯을 불러오는 중...' : 'Cloudinary 위젯으로 이미지 업로드'}</strong>
                <small>JPG, PNG, WEBP · 최대 10MB</small>
              </button>

              {form.image ? (
                <div className="product-image-preview">
                  <img src={form.image} alt={`${isEditing ? '수정할' : '등록할'} 상품 미리보기`} />
                  <div><strong>{fileName}</strong><small>대표 이미지</small></div>
                  <button type="button" onClick={removeImage}>삭제</button>
                </div>
              ) : <div className="product-image-empty" aria-hidden="true" />}
            </section>

            <section className="product-create-card product-spin-card">
              <div className="product-spin-heading">
                <div>
                  <h2>360도 어라운드 뷰 <span>(선택)</span></h2>
                  <p>같은 높이와 배경에서 촬영한 이미지를 파일명 번호순으로 선택해 주세요.</p>
                </div>
                <button type="button" onClick={openSpinUploadWidget} disabled={isWidgetLoading || isLoadingProduct || form.spinImages.length >= 48}>
                  <Icon name="upload" size={17} /> 프레임 추가
                </button>
              </div>

              {form.spinImages.length ? (
                <>
                  <div className="product-spin-summary"><strong>{form.spinImages.length}장 등록됨</strong><span>권장 24~36장 · 최대 48장</span></div>
                  <div className="product-spin-frames">
                    {form.spinImages.map((image, index) => (
                      <figure key={`${image}-${index}`}>
                        <ProductFrameImage source={image} alt={`360도 프레임 ${index + 1}`} />
                        <figcaption>{String(index + 1).padStart(2, '0')}</figcaption>
                        <button type="button" aria-label={`${index + 1}번 프레임 삭제`} onClick={() => removeSpinImage(index)}>×</button>
                      </figure>
                    ))}
                  </div>
                </>
              ) : (
                <div className="product-spin-empty">
                  <strong>등록된 360도 이미지가 없습니다.</strong>
                  <span>프레임을 2장 이상 등록하면 상품 상세 화면에 360도 뷰가 표시됩니다.</span>
                </div>
              )}
            </section>
          </form>
        </main>

        <footer className="product-create-actions">
          <button type="button" onClick={() => navigate('/admin/products')}>취소</button>
          <button type="submit" form="product-create-form" disabled={isSubmitting || isLoadingProduct || didProductLoadFail}>{isSubmitting ? `${isEditing ? '수정' : '등록'} 중...` : `상품 ${isEditing ? '수정' : '등록'}`}</button>
        </footer>
      </div>
    </div>
  )
}

export default ProductCreatePage
