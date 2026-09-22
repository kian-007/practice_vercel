import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../api";
import "../../pages/dashboard/dashboard.css";

const API_URL = import.meta.env.VITE_API_URL;

const ShortUrls = () => {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(5);

  const loadUrls = async () => {
    try {
      const res = await fetchWithAuth(
        `${API_URL}/urls?page=${page}&limit=${limit}`,
      );

      const data = await res.json();

      if (data.success) {
        setUrls(data.urls);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Load URLs error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUrls();
  }, [page]);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!originalUrl.trim()) return;
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_URL}/urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: originalUrl.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error("Create URL failed:", data.message);
        return;
      }

      setShortUrl(data.url.short_code);
      setOriginalUrl("");
      await loadUrls();
    } catch (error) {
      console.error("Create URL error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlRevoke = async (id) => {
    const confirmed = window.confirm("Are you sure?");
    if (!confirmed) return;
    await fetchWithAuth(`${API_URL}/urls/${id}`, {
      method: "DELETE",
    });
    loadUrls();
  };

  return (
    <>
      {/* {loading && <p>در حال بارگذاری...</p>} */}
      <form onSubmit={handleUrlSubmit}>
        <h2>Create your short URLs</h2>
        <div className="shortUrls">
          <input
            placeholder="Original Url"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
          />
          <span>Short URL: {shortUrl}</span>
          <button disabled={loading}>
            {loading ? "Creating..." : "Create Url"}
          </button>
        </div>
      </form>

      <div className="urls">
        <h1>All Urls</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {urls.map((url) => (
              <div key={url.id} className="url-row">
                <span style={{ flexGrow: "2" }}>{url.original_url}</span>

                <span>{url.short_code}</span>

                <button onClick={() => handleUrlRevoke(url.id)}>Delete</button>
              </div>
            ))}

            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                before
              </button>

              <span>
                page {page} from {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                next
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ShortUrls;
