const postsList = document.getElementById("posts-list");
const createPostForm = document.getElementById("create-post-form");
const updatePostForm = document.getElementById("update-post-form");
const notification = document.getElementById("notification");
const userModal = document.getElementById("user-modal");
const modalUserDetails = document.getElementById("modal-user-details");
const closeModal = document.querySelector(".close-modal");
const selectedPostId = null;
let posts = [];
let userCache = {};

document.addEventListener("DOMContentLoaded", () => {
	getDataFromLocal();
	events();
});

function events() {
	createPostForm.addEventListener("submit", addPost);
	updatePostForm.addEventListener("submit", editPost);

	closeModal.addEventListener("click", () => {
		userModal.style.display = "none";
	});

	window.addEventListener("click", (e) => {
		if (e.target === userModal) {
			userModal.style.display = "none";
		}
	});
}

function savePostsInLocal() {
	localStorage.setItem("postKeys", JSON.stringify(posts));
}

function saveUserInLocal(user) {
	const users = JSON.parse(localStorage.getItem("usersKeys") || "{}");
	users[user.id] = user;
	localStorage.setItem("usersKeys", JSON.stringify(users));

	userCache[user.id] = user;
}

function getLocalUser(userId) {
	if (userCache[userId]) {
		return userCache[userId];
	}

	const users = JSON.parse(localStorage.getItem("usersKeys") || "{}");
	if (users[userId]) {
		userCache[userId] = users[userId];
	}
	return users[userId];
}

function getDataFromLocal() {
	const storedPosts = localStorage.getItem("postKeys");
	const storedUsers = localStorage.getItem("usersKeys");

	if (storedUsers) {
		userCache = JSON.parse(storedUsers);
	}

	if (storedPosts) {
		posts = JSON.parse(storedPosts);
		showPosts(posts);
	} else {
		fetchPosts();
	}
}

async function fetchPosts() {
	try {
		const response = await fetch("https://jsonplaceholder.typicode.com/posts");

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		posts = await response.json();
		showPosts(posts);

		savePostsInLocal();

		notify("Posts loaded successfully", "success");
	} catch (error) {
		notify(`Failed to fetch posts: ${error.message}`, "error");
		postsList.innerHTML = "<p>Error loading posts. Please try again later.</p>";
	}
}

async function addPost(event) {
	event.preventDefault();

	const title = document.getElementById("new-title").value;
	const body = document.getElementById("new-body").value;
	const userId = document.getElementById("new-userId").value;

	const newPost = { title, body, userId };

	try {
		const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(newPost),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const createdPost = await response.json();

		const newId = Date.now();

		const finalPost = { ...createdPost, id: newId, isLocal: true };
		posts.unshift(finalPost);

		savePostsInLocal();

		showPosts(posts);

		notify("Post created successfully!", "success");
		createPostForm.reset();
	} catch (error) {
		notify(`Failed to create post: ${error.message}`, "error");
	}
}

async function editPost(event) {
	event.preventDefault();

	const id = Number.parseInt(document.getElementById("update-id").value);
	const title = document.getElementById("update-title").value;
	const body = document.getElementById("update-body").value;

	const index = posts.findIndex((post) => post.id === id);
	if (index === -1) {
		notify("Post not found", "error");
		return;
	}

	const originalPost = posts[index];
	const updatedPost = {
		...originalPost,
		title,
		body,
	};

	if (originalPost.isLocal || id > 100) {
		posts[index] = updatedPost;
		savePostsInLocal();
		showPosts(posts);
		notify("Post updated successfully!", "success");
		updatePostForm.reset();
		return;
	}

	try {
		const response = await fetch(
			`https://jsonplaceholder.typicode.com/posts/${id}`,
			{
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedPost),
			}
		);

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const result = await response.json();

		result.userId = originalPost.userId;

		posts[index] = result;
		savePostsInLocal();
		showPosts(posts);

		notify("Post updated successfully!", "success");
		updatePostForm.reset();
	} catch (error) {
		notify(`Failed to update post: ${error.message}`, "error");
	}
}

function delPost(id) {
	if (id > 100) {
		posts = posts.filter((post) => post.id !== id);
		savePostsInLocal();
		showPosts(posts);
		notify("Post deleted successfully!", "success");
		return;
	}

	const xhr = new XMLHttpRequest();
	xhr.open("DELETE", `https://jsonplaceholder.typicode.com/posts/${id}`, true);

	xhr.onload = () => {
		if (xhr.status >= 200 && xhr.status < 300) {
			posts = posts.filter((post) => post.id !== id);

			savePostsInLocal();

			showPosts(posts);

			notify("Post deleted successfully!", "success");
		} else {
			notify(`Failed to delete post: HTTP error ${xhr.status}`, "error");
		}
	};

	xhr.onerror = () => {
		notify("Network error occurred while trying to delete post", "error");
	};

	xhr.send();
}

async function getUsername(userId) {
	const cachedUser = getLocalUser(userId);

	if (cachedUser) {
		return cachedUser.name;
	}

	try {
		const response = await fetch(
			`https://jsonplaceholder.typicode.com/users/${userId}`
		);
		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const user = await response.json();
		saveUserInLocal(user);
		return user.name;
	} catch (error) {
		console.log(`Error fetching username: ${error.message}`);
		return `User ${userId}`;
	}
}

function getUser(userId) {
	const cachedUser = getLocalUser(userId);

	if (cachedUser) {
		showUser(cachedUser);
		userModal.style.display = "block";
		return;
	}

	modalUserDetails.innerHTML = "<p>Loading user details...</p>";
	userModal.style.display = "block";

	const xhr = new XMLHttpRequest();
	xhr.open("GET", `https://jsonplaceholder.typicode.com/users/${userId}`, true);

	xhr.onload = () => {
		if (xhr.status >= 200 && xhr.status < 300) {
			try {
				const user = JSON.parse(xhr.responseText);

				saveUserInLocal(user);

				showUser(user);
			} catch (error) {
				notify("Error parsing user data", "error");
				modalUserDetails.innerHTML = "<p>Error loading user details</p>";
			}
		} else {
			notify(`Failed to fetch user details: HTTP error ${xhr.status}`, "error");
			modalUserDetails.innerHTML = "<p>Error loading user details</p>";
		}
	};

	xhr.onerror = () => {
		notify("Network error occurred while trying to fetch user details", "error");
		modalUserDetails.innerHTML = "<p>Network error. Please try again later.</p>";
	};

	xhr.send();
}

async function showPosts(posts) {
	if (posts.length === 0) {
		postsList.innerHTML = "<p>No posts available.</p>";
		return;
	}

	postsList.innerHTML = "";

	for (const post of posts) {
		const postElement = document.createElement("div");
		postElement.className = "post-card";
		postElement.id = post.id;
		postElement.userId = post.userId;

		if (post.id === selectedPostId) {
			postElement.classList.add("selected");
		}

		const username = await getUsername(post.userId);

		postElement.innerHTML = `
            <h3 class="post-title">${post.title}</h3>
            <p class="post-body">${post.body}</p>
            <p class="post-author">By ${username}</p>
            <div class="post-actions">
                <button class="post-btn post-btn-edit">Edit</button>
                <button class="post-btn post-btn-delete">Delete</button>
                <button class="post-btn post-btn-view">View User</button>
            </div>
        `;

		const editBtn = postElement.querySelector(".post-btn-edit");
		const deleteBtn = postElement.querySelector(".post-btn-delete");
		const viewBtn = postElement.querySelector(".post-btn-view");

		editBtn.addEventListener("click", () => {
			document.getElementById("update-id").value = post.id;
			document.getElementById("update-title").value = post.title;
			document.getElementById("update-body").value = post.body;
			document.getElementById("update-userId").value = post.userId;

			document
				.getElementById("update-post-form")
				.scrollIntoView({ behavior: "smooth" });
		});

		deleteBtn.addEventListener("click", () => {
			delPost(post.id);
		});

		viewBtn.addEventListener("click", () => {
			getUser(post.userId);
		});

		postsList.appendChild(postElement);
	}
}

function showUser(user) {
	modalUserDetails.innerHTML = `
        <h3>${user.name}</h3>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Phone:</strong> ${user.phone}</p>
        <p><strong>Website:</strong> ${user.website}</p>
        <p><strong>Company:</strong> ${user.company.name}</p>
        <p><strong>Address:</strong> ${user.address.street}, ${user.address.suite}, ${user.address.city}, ${user.address.zipcode}</p>
    `;
}

function notify(message, type) {
	notification.textContent = message;
	notification.className = `notification ${type}`;
	notification.style.display = "block";

	setTimeout(() => {
		notification.style.display = "none";
	}, 5000);
}