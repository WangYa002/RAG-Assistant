class AppError(Exception):
    """业务错误：路由层统一转换为 {code, message} JSON 响应。"""

    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
