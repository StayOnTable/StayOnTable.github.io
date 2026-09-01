import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found shell">
      <span>404 / PAGE NOT FOUND</span>
      <h1>这一页还没有写下来。</h1>
      <p>也许链接已经移动，或者它仍然只是一个待完成的想法。</p>
      <Link className="button button--primary" href="/">回到首页</Link>
    </div>
  );
}
