import './AnnouncementBar.css'

function AnnouncementBar() {
  return (
    <div className="announcement-bar" role="note" aria-label="쇼핑 혜택 안내">
      <span>오늘 가입하면 첫 구매 10% 할인</span>
      <span aria-hidden="true">·</span>
      <span>5만원 이상 무료배송</span>
    </div>
  )
}

export default AnnouncementBar
