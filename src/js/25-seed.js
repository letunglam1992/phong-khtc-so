/* ============================================================
   25-seed.js — Dữ liệu khởi tạo có nguồn gốc văn bản
   (1) Danh mục chức năng, nhiệm vụ: bóc tách từ Điều 2 Quyết định số 324/QĐ-SNNMT ngày 02/4/2025
       của Giám đốc Sở Nông nghiệp và Môi trường tỉnh Sơn La. Mã có hậu tố a, b, c… là do phần mềm
       tách một điểm thành nhiều việc thành phần; căn cứ vẫn là điểm gốc.
   (2) Cán bộ, đơn vị dự toán, gợi ý phân công: lấy từ Thông báo số 279/TB-KHTC ngày 27/8/2026 —
       chỉ để tham khảo; KHÔNG tự gán cán bộ chủ trì.
   Không có số liệu tài chính nào được tạo sẵn.
   ============================================================ */
'use strict';
(function (A) {
  const QD = 'QĐ 324/QĐ-SNNMT ngày 02/4/2025';
  const V = 'vanban', P = 'phanloai';
  // [mã, nhóm, tên, vai trò (theo câu chữ), tính chất, kỳ, nguồn chu kỳ, sản phẩm, điểm căn cứ, gợi ý phân công tham khảo]
  const DM = [
    ['1.1a', '1', 'Xây dựng và chỉ đạo triển khai thực hiện kế hoạch 5 năm, kế hoạch hàng năm, dài hạn về phát triển nông nghiệp, môi trường và kế hoạch đầu tư công', 'Chủ trì tham mưu', 'dinhky', ['nam'], V, 'Kế hoạch 5 năm, kế hoạch hàng năm; kế hoạch đầu tư công', 'điểm 1.1 khoản 1 Điều 2', 'Nhung (kế hoạch); Kiên (đầu tư công)'],
    ['1.1b', '1', 'Báo cáo đánh giá, giám sát đầu tư công đối với dự án đầu tư công do Sở làm chủ đầu tư', 'Chủ trì tham mưu', 'thuongxuyen', [], P, 'Báo cáo đánh giá, giám sát đầu tư', 'điểm 1.1 khoản 1 Điều 2', 'Kiên'],
    ['1.1c', '1', 'Thống kê các chỉ tiêu quy hoạch ngành nông nghiệp, môi trường', 'Chủ trì phối hợp với các phòng, đơn vị', 'thuongxuyen', [], P, '', 'điểm 1.1 khoản 1 Điều 2', 'Kiên (quy hoạch)'],
    ['1.2', '1', 'Xây dựng, tổng hợp kết quả thực hiện các chương trình, đề án, nghị quyết, kế hoạch của Tỉnh ủy, HĐND tỉnh và UBND tỉnh về phát triển lĩnh vực nông nghiệp và môi trường', 'Chủ trì hoặc phối hợp', 'thuongxuyen', [], P, '', 'điểm 1.2 khoản 1 Điều 2', 'Kiên'],
    ['1.3', '1', 'Hướng dẫn các đơn vị trực thuộc Sở xây dựng kế hoạch dài hạn và kế hoạch hàng năm (kế hoạch sản xuất, kế hoạch đầu tư, kế hoạch sự nghiệp nông nghiệp và môi trường)', 'Hướng dẫn', 'dinhky', ['nam'], V, 'Văn bản hướng dẫn', 'điểm 1.3 khoản 1 Điều 2', 'Nhung'],
    ['1.4a', '1', 'Kiểm tra tình hình thực hiện kế hoạch của ngành đã được phê duyệt', 'Phối hợp với các đơn vị', 'thuongxuyen', [], P, '', 'điểm 1.4 khoản 1 Điều 2', ''],
    ['1.4b', '1', 'Đề xuất Giám đốc Sở trình điều chỉnh kế hoạch 5 năm và hàng năm của ngành căn cứ yêu cầu thực tế', 'Tham mưu đề xuất', 'dotxuat', [], P, 'Tờ trình điều chỉnh kế hoạch', 'điểm 1.4 khoản 1 Điều 2', ''],
    ['1.4c', '1', 'Tổng hợp đề xuất các giải pháp nâng cao hiệu lực quản lý thực hiện kế hoạch của ngành', 'Chủ trì tổng hợp', 'thuongxuyen', [], P, '', 'điểm 1.4 khoản 1 Điều 2', ''],
    ['1.5', '1', 'Thẩm định kế hoạch, các chương trình, đề án, dự án, nhiệm vụ do Sở làm chủ đầu tư', 'Tham mưu lãnh đạo Sở chủ trì, phối hợp với các sở, ngành, phòng, đơn vị', 'dotxuat', [], P, '', 'điểm 1.5 khoản 1 Điều 2', 'Chuyên viên theo lĩnh vực'],
    ['1.6', '1', 'Đề xuất chủ trương và trình phê duyệt các nhiệm vụ, đề án, dự án do Sở làm chủ đầu tư', 'Chủ trì hoặc phối hợp', 'dotxuat', [], P, 'Tờ trình chủ trương, tờ trình phê duyệt', 'điểm 1.6 khoản 1 Điều 2', 'Chuyên viên theo lĩnh vực'],
    ['1.7', '1', 'Tổ chức điều tra, thu thập, tổng hợp báo cáo số liệu thống kê thuộc lĩnh vực nông nghiệp và môi trường', 'Phối hợp với các đơn vị', 'thuongxuyen', [], P, 'Báo cáo số liệu thống kê', 'điểm 1.7 khoản 1 Điều 2', 'Nhung'],
    ['1.8', '1', 'Tổng hợp báo cáo tình hình sản xuất nông, lâm nghiệp và thủy sản hàng tháng, quý, 6 tháng, 9 tháng, năm', 'Tổng hợp', 'dinhky', ['thang', 'quy', '6thang', '9thang', 'nam'], V, 'Báo cáo tình hình sản xuất nông, lâm nghiệp và thủy sản', 'điểm 1.8 khoản 1 Điều 2', 'Nhung; Thư'],
    ['1.9a', '1', 'Đề xuất xây dựng, điều chỉnh danh mục dịch vụ sự nghiệp công', 'Chủ trì phối hợp với các phòng, đơn vị', 'dotxuat', [], P, 'Danh mục dịch vụ sự nghiệp công', 'điểm 1.9 khoản 1 Điều 2', 'Nhung'],
    ['1.9b', '1', 'Xây dựng, điều chỉnh định mức kinh tế kỹ thuật, giá dịch vụ sự nghiệp công sử dụng ngân sách nhà nước thuộc trách nhiệm của ngành', 'Phối hợp với các phòng, đơn vị', 'dotxuat', [], P, 'Định mức kinh tế kỹ thuật; giá dịch vụ sự nghiệp công', 'điểm 1.9 khoản 1 Điều 2', 'Nhung; chuyên viên theo lĩnh vực'],
    ['1.10a', '1', 'Tổng hợp nhu cầu kinh phí sử dụng nguồn sự nghiệp bảo vệ môi trường hàng năm của các sở, ban, ngành, UBND cấp huyện gửi Sở Tài chính', 'Chủ trì, phối hợp với các phòng, đơn vị', 'dinhky', ['nam'], V, 'Văn bản tổng hợp nhu cầu kinh phí gửi Sở Tài chính', 'điểm 1.10 khoản 1 Điều 2', ''],
    ['1.10b', '1', 'Theo dõi, giám sát việc thực hiện kế hoạch và dự toán ngân sách từ nguồn sự nghiệp bảo vệ môi trường sau khi được phê duyệt', 'Theo dõi, giám sát', 'thuongxuyen', [], P, '', 'điểm 1.10 khoản 1 Điều 2', ''],
    ['1.11a', '1', 'Tham mưu ký hợp đồng và quản lý hợp đồng; theo dõi, đôn đốc các phòng, đơn vị liên quan triển khai thực hiện (chương trình, nhiệm vụ, dự án do Sở làm chủ đầu tư)', 'Tham mưu', 'thuongxuyen', [], P, 'Hợp đồng', 'điểm 1.11 khoản 1 Điều 2', 'Chuyên viên theo lĩnh vực'],
    ['1.11b', '1', 'Lập bảng xác định khối lượng hoàn thành', 'Thực hiện', 'dotxuat', [], P, 'Bảng xác định khối lượng hoàn thành', 'điểm 1.11 khoản 1 Điều 2', 'Chuyên viên theo lĩnh vực'],
    ['1.11c', '1', 'Báo cáo quyết toán dự án hoàn thành đối với chương trình, nhiệm vụ, dự án do Sở làm chủ đầu tư', 'Thực hiện', 'dotxuat', [], P, 'Báo cáo quyết toán dự án hoàn thành', 'điểm 1.11 khoản 1 Điều 2', 'Chuyên viên theo lĩnh vực'],
    ['1.12', '1', 'Tổng hợp thống kê ngành nông nghiệp, môi trường, các chỉ tiêu phát triển kinh tế - xã hội', 'Chủ trì phối hợp với các phòng, đơn vị', 'thuongxuyen', [], P, '', 'điểm 1.12 khoản 1 Điều 2', 'Nhung'],
    ['1.13a', '1', 'Thẩm định kế hoạch lựa chọn nhà thầu, lập kế hoạch lựa chọn nhà thầu', 'Chủ trì phối hợp với các phòng, đơn vị', 'dotxuat', [], P, 'Kế hoạch lựa chọn nhà thầu; báo cáo thẩm định', 'điểm 1.13 khoản 1 Điều 2', 'Thực'],
    ['1.13b', '1', 'Tổ chức đấu thầu theo phân cấp', 'Chủ trì phối hợp với các phòng, đơn vị', 'dotxuat', [], P, '', 'điểm 1.13 khoản 1 Điều 2', 'Thực; chuyên viên theo lĩnh vực'],

    ['2.1', '2', 'Tổng hợp trình thẩm định, phê duyệt, điều chỉnh chương trình khuyến nông 5 năm và kế hoạch khuyến nông hàng năm cấp tỉnh', 'Tổng hợp trình', 'dinhky', ['nam'], V, 'Chương trình khuyến nông 5 năm; kế hoạch khuyến nông hàng năm', 'điểm 2.1 khoản 2 Điều 2', 'Kiên'],
    ['2.2', '2', 'Xây dựng trình ban hành, sửa đổi, bổ sung định mức kinh tế kỹ thuật về khuyến nông; quy định nội dung chi và mức chi hỗ trợ hoạt động khuyến nông từ ngân sách địa phương', 'Chủ trì phối hợp các đơn vị', 'dotxuat', [], P, 'Định mức kinh tế kỹ thuật khuyến nông; quy định nội dung chi, mức chi', 'điểm 2.2 khoản 2 Điều 2', 'Kiên'],
    ['2.3a', '2', 'Hướng dẫn các đơn vị thuộc Sở đăng ký, đề xuất nhiệm vụ khoa học công nghệ cấp tỉnh, cấp bộ', 'Hướng dẫn', 'thuongxuyen', [], P, '', 'điểm 2.3 khoản 2 Điều 2', 'Thư'],
    ['2.3b', '2', 'Tổ chức thẩm định cấp cơ sở các nhiệm vụ khoa học và công nghệ cấp tỉnh do các đơn vị, tổ chức, cá nhân đề xuất thuộc lĩnh vực nông nghiệp và môi trường', 'Tham mưu', 'dotxuat', [], P, '', 'điểm 2.3 khoản 2 Điều 2', 'Thư'],
    ['2.4a', '2', 'Kiểm tra việc thực hiện các nhiệm vụ khoa học công nghệ thuộc lĩnh vực của ngành', 'Tham gia', 'dotxuat', [], P, '', 'điểm 2.4 khoản 2 Điều 2', 'Thư'],
    ['2.4b', '2', 'Tổng hợp báo cáo kết quả thực hiện các nhiệm vụ khuyến nông, khoa học và công nghệ theo quy định', 'Tổng hợp', 'thuongxuyen', [], P, 'Báo cáo kết quả thực hiện nhiệm vụ khuyến nông, khoa học và công nghệ', 'điểm 2.4 khoản 2 Điều 2', 'Thư; Kiên'],

    ['3', '3', 'Xây dựng, quản lý, triển khai thực hiện có hiệu quả các chương trình, dự án theo phân công của lãnh đạo Sở', 'Chủ trì, phối hợp với các đơn vị có liên quan tham mưu', 'thuongxuyen', [], P, '', 'khoản 3 Điều 2', 'Theo biểu phân công quản lý chương trình, dự án'],

    ['4.1.a1', '4', 'Tổng hợp trình cấp có thẩm quyền kế hoạch tài chính 05 năm, kế hoạch tài chính - ngân sách nhà nước 03 năm; dự toán thu, chi ngân sách hàng năm của các đơn vị trực thuộc và lập phương án phân bổ ngân sách hàng năm', 'Tổng hợp trình', 'dinhky', ['nam'], V, 'Kế hoạch tài chính; dự toán thu, chi; phương án phân bổ', 'tiết a điểm 4.1 khoản 4 Điều 2', 'Thương'],
    ['4.1.a2', '4', 'Hướng dẫn các đơn vị dự toán trực thuộc xây dựng dự toán ngân sách nhà nước hàng năm, kế hoạch tài chính - NSNN 5 năm, 3 năm', 'Tham mưu lãnh đạo Sở hướng dẫn', 'dinhky', ['nam'], V, 'Văn bản hướng dẫn', 'tiết a điểm 4.1 khoản 4 Điều 2', 'Thương'],
    ['4.1.b1', '4', 'Báo cáo tình hình thực hiện dự toán NSNN 6 tháng đầu năm, nhiệm vụ biện pháp 6 tháng cuối năm; đánh giá ước thực hiện dự toán NSNN cả năm', 'Phối hợp với các đơn vị liên quan tham mưu', 'dinhky', ['6thang', 'nam'], V, 'Báo cáo thực hiện dự toán 6 tháng; đánh giá ước thực hiện cả năm', 'tiết b điểm 4.1 khoản 4 Điều 2', 'Thương'],
    ['4.1.b2', '4', 'Hướng dẫn quản lý, điều hành ngân sách các đơn vị; kiểm tra việc phân bổ dự toán được giao; theo dõi, đôn đốc việc tổ chức thực hiện dự toán', 'Hướng dẫn, kiểm tra, đôn đốc', 'thuongxuyen', [], P, '', 'tiết b điểm 4.1 khoản 4 Điều 2', 'Chuyên viên phụ trách đơn vị'],
    ['4.1.b3', '4', 'Tổng hợp nhu cầu cải cách tiền lương của các đơn vị trực thuộc Sở gửi Sở Tài chính thẩm định', 'Tổng hợp', 'dotxuat', [], P, 'Văn bản tổng hợp nhu cầu cải cách tiền lương', 'tiết b điểm 4.1 khoản 4 Điều 2', ''],
    ['4.1.b4', '4', 'Tổng hợp trình đề nghị bổ sung, điều chỉnh kinh phí của các đơn vị dự toán trực thuộc Sở', 'Tổng hợp trình', 'dotxuat', [], P, 'Tờ trình bổ sung, điều chỉnh kinh phí', 'tiết b điểm 4.1 khoản 4 Điều 2', 'Chuyên viên phụ trách đơn vị'],
    ['4.1.c1', '4', 'Tổng hợp tình hình thu, chi NSNN, quyết toán ngân sách hàng năm của các đơn vị trực thuộc Sở gửi Sở Tài chính thẩm định', 'Tổng hợp', 'dinhky', ['nam'], V, 'Báo cáo quyết toán ngân sách năm', 'tiết c điểm 4.1 khoản 4 Điều 2', 'Thương'],
    ['4.1.c2', '4', 'Định kỳ báo cáo việc thực hiện dự toán thu, chi ngân sách', 'Thực hiện', 'dinhky', [], V, 'Báo cáo thực hiện dự toán thu, chi', 'tiết c điểm 4.1 khoản 4 Điều 2', 'Thương'],
    ['4.1.c3', '4', 'Tổ chức thực hiện chế độ công khai tài chính ngân sách; đôn đốc, hướng dẫn các đơn vị thực hiện công khai tài chính ngân sách, chế độ hạch toán kế toán, tài chính, tài sản công', 'Tổ chức thực hiện; đôn đốc, hướng dẫn', 'thuongxuyen', [], P, 'Báo cáo, quyết định công khai', 'tiết c điểm 4.1 khoản 4 Điều 2', 'Thương'],
    ['4.1.c4', '4', 'Kiểm tra, thẩm tra dự toán ngân sách các đơn vị dự toán trực thuộc; thẩm định hoặc xét duyệt và thông báo kết quả thẩm định, xét duyệt quyết toán đối với các đơn vị trực thuộc Sở', 'Thực hiện', 'dinhky', ['nam'], P, 'Biên bản, thông báo xét duyệt quyết toán', 'tiết c điểm 4.1 khoản 4 Điều 2', 'Chuyên viên phụ trách đơn vị'],
    ['4.1.d1', '4', 'Thực hiện kế toán các chương trình, nhiệm vụ, dự án, đề án do Sở làm chủ đầu tư; hạch toán, ghi sổ kế toán; lập báo cáo tài chính, báo cáo quyết toán; thanh lý hợp đồng', 'Thực hiện', 'thuongxuyen', [], P, 'Sổ kế toán; báo cáo tài chính; báo cáo quyết toán', 'tiết d điểm 4.1 khoản 4 Điều 2', ''],
    ['4.1.d2', '4', 'Tổng hợp báo cáo tài chính nhà nước đối với các đơn vị trực thuộc Sở theo Thông tư số 99/2018/TT-BTC', 'Tổng hợp', 'dinhky', ['nam'], P, 'Báo cáo tài chính nhà nước', 'tiết d điểm 4.1 khoản 4 Điều 2', 'Thương'],
    ['4.2.a', '4', 'Tổng hợp, phê duyệt, trình phê duyệt nhiệm vụ, dự toán mua sắm, điều chuyển tài sản theo phân cấp của HĐND, UBND tỉnh', 'Tổng hợp, trình', 'dotxuat', [], P, 'Tờ trình, quyết định mua sắm, điều chuyển tài sản', 'tiết a điểm 4.2 khoản 4 Điều 2', 'Tuấn; chuyên viên phụ trách đơn vị'],
    ['4.2.b', '4', 'Tổng hợp, trình phê duyệt, điều chỉnh tiêu chuẩn, định mức sử dụng tài sản theo phân cấp của HĐND, UBND tỉnh', 'Tổng hợp, trình', 'dotxuat', [], P, 'Tiêu chuẩn, định mức sử dụng tài sản', 'tiết b điểm 4.2 khoản 4 Điều 2', 'Tuấn'],
    ['4.2.c1', '4', 'Tổng hợp báo cáo tình hình quản lý, sử dụng tài sản công hàng năm hoặc đột xuất theo yêu cầu', 'Chủ trì tổng hợp', 'dinhky', ['nam'], V, 'Báo cáo tình hình quản lý, sử dụng tài sản công', 'tiết c điểm 4.2 khoản 4 Điều 2', 'Tuấn'],
    ['4.2.c2', '4', 'Đôn đốc, hướng dẫn các đơn vị thực hiện công khai, quản lý, sử dụng tài sản công', 'Đôn đốc, hướng dẫn', 'thuongxuyen', [], P, '', 'tiết c điểm 4.2 khoản 4 Điều 2', 'Tuấn'],
    ['4.2.c3', '4', 'Tổng hợp báo cáo tổng kiểm kê tài sản theo quy định', 'Tổng hợp', 'dotxuat', [], P, 'Báo cáo tổng kiểm kê tài sản', 'tiết c điểm 4.2 khoản 4 Điều 2', 'Tuấn'],
    ['4.2.d', '4', 'Các nội dung về quản lý, sử dụng tài sản công theo thẩm quyền, theo phân cấp của HĐND, UBND tỉnh', 'Theo thẩm quyền', 'thuongxuyen', [], P, '', 'tiết d điểm 4.2 khoản 4 Điều 2', 'Tuấn'],

    ['5.1', '5', 'Hướng dẫn, đôn đốc việc thực hiện cơ chế tự chủ, tự chịu trách nhiệm về sử dụng biên chế và kinh phí đối với cơ quan hành chính, đơn vị sự nghiệp công lập', 'Hướng dẫn, đôn đốc', 'thuongxuyen', [], P, '', 'điểm 5.1 khoản 5 Điều 2', 'Nga'],
    ['5.2', '5', 'Tổng hợp phương án tự chủ tài chính của các đơn vị sự nghiệp công lập, trình xin ý kiến cơ quan liên quan, trình UBND tỉnh phê duyệt giao tự chủ', 'Chủ trì tổng hợp', 'dotxuat', [], P, 'Phương án tự chủ tài chính; tờ trình', 'điểm 5.2 khoản 5 Điều 2', 'Nga'],
    ['5.3', '5', 'Kiểm tra, hướng dẫn việc thực hiện cơ chế tự chủ, tự chịu trách nhiệm đối với các đơn vị sự nghiệp công lập lĩnh vực nông nghiệp và môi trường của tỉnh', 'Kiểm tra, hướng dẫn', 'thuongxuyen', [], P, '', 'điểm 5.3 khoản 5 Điều 2', 'Nga'],
    ['5.4', '5', 'Tổng hợp báo cáo kết quả thực hiện cơ chế tự chủ của các đơn vị thuộc Sở hàng năm hoặc đột xuất theo yêu cầu', 'Tổng hợp', 'dinhky', ['nam'], V, 'Báo cáo kết quả thực hiện cơ chế tự chủ', 'điểm 5.4 khoản 5 Điều 2', 'Nga'],

    ['6.1a', '6', 'Đầu mối phối hợp cung cấp hồ sơ, tài liệu phục vụ thanh tra, kiểm toán đối với báo cáo quyết toán ngân sách của Sở', 'Chủ trì đầu mối phối hợp', 'dotxuat', [], P, 'Hồ sơ, tài liệu cung cấp', 'điểm 6.1 khoản 6 Điều 2', 'Tuấn'],
    ['6.1b', '6', 'Tham mưu, đôn đốc, tổng hợp số liệu báo cáo thực hiện các kết luận, kiến nghị của thanh tra, kiểm toán', 'Tham mưu, đôn đốc, tổng hợp', 'thuongxuyen', [], P, 'Báo cáo thực hiện kết luận, kiến nghị', 'điểm 6.1 khoản 6 Điều 2', 'Tuấn'],
    ['6.2a', '6', 'Kiểm tra thường xuyên công tác quản lý tài chính, tài sản đối với các đơn vị dự toán thuộc Sở', 'Thực hiện', 'thuongxuyen', [], V, 'Kế hoạch, kết quả kiểm tra', 'điểm 6.2 khoản 6 Điều 2', 'Tuấn'],
    ['6.2b', '6', 'Tham gia đoàn kiểm tra của Sở phân công (nếu có)', 'Tham gia', 'dotxuat', [], V, '', 'điểm 6.2 khoản 6 Điều 2', ''],

    ['7.1', '7', 'Hướng dẫn, đôn đốc các đơn vị trực thuộc xây dựng và thực hiện Chương trình thực hành tiết kiệm, chống lãng phí hàng năm', 'Hướng dẫn, đôn đốc', 'dinhky', ['nam'], V, '', 'điểm 7.1 khoản 7 Điều 2', 'Tuấn'],
    ['7.2a', '7', 'Trình Ban Giám đốc ban hành Chương trình thực hành tiết kiệm, chống lãng phí hàng năm', 'Chủ trì tham mưu', 'dinhky', ['nam'], V, 'Chương trình thực hành tiết kiệm, chống lãng phí năm', 'điểm 7.2 khoản 7 Điều 2', 'Tuấn'],
    ['7.2b', '7', 'Tổng hợp báo cáo thực hành tiết kiệm, chống lãng phí định kỳ 6 tháng, năm', 'Tổng hợp', 'dinhky', ['6thang', 'nam'], V, 'Báo cáo thực hành tiết kiệm, chống lãng phí', 'điểm 7.2 khoản 7 Điều 2', 'Tuấn'],
    ['7.2c', '7', 'Tổng hợp báo cáo đánh giá kết quả thực hành tiết kiệm, chống lãng phí trong chi thường xuyên hàng năm của ngành', 'Tổng hợp', 'dinhky', ['nam'], V, 'Báo cáo đánh giá kết quả thực hành tiết kiệm, chống lãng phí trong chi thường xuyên', 'điểm 7.2 khoản 7 Điều 2', 'Tuấn'],

    ['8a', '8', 'Tổng hợp, trình UBND tỉnh, Sở Tài chính đề án thu phí, lệ phí thuộc trách nhiệm của ngành nông nghiệp và môi trường', 'Chủ trì tổng hợp', 'dotxuat', [], P, 'Đề án thu phí, lệ phí', 'khoản 8 Điều 2', 'Hòa'],
    ['8b', '8', 'Hướng dẫn việc quản lý, sử dụng các khoản phí, lệ phí', 'Phối hợp các phòng, đơn vị', 'thuongxuyen', [], P, '', 'khoản 8 Điều 2', 'Hòa'],

    ['9.1', '9', 'Tham mưu đề xuất, tổng hợp báo cáo công tác thu hút đầu tư trong và ngoài nước thuộc lĩnh vực nông nghiệp và môi trường', 'Chủ trì, phối hợp với các đơn vị', 'thuongxuyen', [], P, 'Báo cáo công tác thu hút đầu tư', 'điểm 9.1 khoản 9 Điều 2', 'Kiên'],
    ['9.2', '9', 'Theo dõi, tổng hợp báo cáo kết quả thực hiện các nhiệm vụ của ngành nhằm nâng cao chỉ số cải thiện môi trường kinh doanh, năng lực cạnh tranh cấp tỉnh (PCI)', 'Theo dõi, tổng hợp', 'thuongxuyen', [], P, 'Báo cáo kết quả thực hiện nhiệm vụ nâng cao chỉ số PCI', 'điểm 9.2 khoản 9 Điều 2', 'Nhung'],
    ['9.3', '9', 'Theo dõi, tổng hợp báo cáo kết quả thực hiện nhiệm vụ của các Tổ công tác, Ban chỉ đạo; nghị quyết chuyên đề của Ban Thường vụ Tỉnh ủy về lĩnh vực nông nghiệp và môi trường', 'Theo dõi, tổng hợp', 'thuongxuyen', [], P, 'Báo cáo kết quả thực hiện', 'điểm 9.3 khoản 9 Điều 2', 'Kiên'],
    ['9.4', '9', 'Tham gia tổng hợp, xây dựng văn bản tham gia ý kiến vào dự thảo văn bản quy phạm pháp luật và văn bản khác; văn bản tham gia ý kiến thẩm định các chương trình, dự án liên quan lĩnh vực quản lý của ngành khi có yêu cầu', 'Tham gia', 'dotxuat', [], V, 'Văn bản tham gia ý kiến', 'điểm 9.4 khoản 9 Điều 2', 'Lâm (chủ trương đầu tư dự án của tỉnh); chuyên viên theo lĩnh vực'],

    ['10a', '10', 'Trực giải quyết công việc ngoài giờ, ngày thứ Bảy, Chủ nhật, ngày lễ theo phân công của lãnh đạo Phòng', 'Thực hiện', 'dotxuat', [], P, '', 'khoản 10 Điều 2', ''],
    ['10b', '10', 'Các nhiệm vụ khác khi được Ban Giám đốc Sở giao', 'Thực hiện', 'dotxuat', [], V, '', 'khoản 10 Điều 2', '']
  ];
  const GHI_CHU = {
    '1.10a': 'Văn bản ghi "UBND cấp huyện". Cần rà soát lại đối tượng tổng hợp sau khi tổ chức chính quyền địa phương 2 cấp.',
    '4.1.d2': 'Văn bản dẫn Thông tư số 99/2018/TT-BTC. Cần rà soát hiệu lực của Thông tư trước khi áp dụng.',
    '4.2.d': 'Câu chữ tại tiết d điểm 4.2 không có động từ ("Theo thẩm quyền các nội dung về quản lý, sử dụng tài sản công…"). Cần lãnh đạo Phòng xác nhận nội dung nhiệm vụ.',
    '4.1.c2': 'Văn bản ghi "định kỳ" nhưng không nêu kỳ cụ thể. Chọn kỳ khi sinh nhiệm vụ.'
  };

  // Cán bộ theo Thông báo 279/TB-KHTC (không còn Trưởng phòng; đ/c Lê Tùng Lâm phụ trách Phòng — theo thông tin người dùng cung cấp)
  const CB = [
    ['Lê Tùng Lâm', 'Lâm', 'Phụ trách Phòng', 'Lĩnh vực kế hoạch'],
    ['Bùi Thị Nhung', 'Nhung', '', 'Lĩnh vực kế hoạch'],
    ['Kiều Thị Thư', 'Thư', '', 'Lĩnh vực kế hoạch'],
    ['Trịnh Trung Kiên', 'Kiên', '', 'Lĩnh vực kế hoạch'],
    ['Quàng Văn Thực', 'Thực', '', 'Lĩnh vực tài chính'],
    ['Trần Huyền Thương', 'Thương', 'Chuyên viên', 'Lĩnh vực tài chính'],
    ['Lê Anh Tuấn', 'Tuấn', 'Chuyên viên', 'Lĩnh vực tài chính'],
    ['Bùi Khắc Hòa', 'Hòa', 'Chuyên viên', 'Lĩnh vực tài chính'],
    ['Lê Thị Nga', 'Nga', 'Chuyên viên', 'Lĩnh vực tài chính']
  ];
  const DV = [
    ['Văn phòng Sở', 'VP Sở'], ['Chi cục Chăn nuôi, Thú y và Thủy sản', 'CC CNTY-TS'], ['Chi cục Phát triển nông thôn', 'CC PTNT'],
    ['Chi cục Thủy lợi và Tài nguyên nước', 'CC TL-TNN'], ['Chi cục Kiểm lâm', 'CC Kiểm lâm'], ['Chi cục Trồng trọt và Bảo vệ thực vật', 'CC TT-BVTV'],
    ['Trung tâm Khuyến nông và Chuyển đổi số', 'TT KN-CĐS'], ['Văn phòng Đăng ký đất đai', 'VP ĐKĐĐ'], ['Trung tâm Nước và Quan trắc môi trường', 'TT Nước-QTMT']
  ];

  // Danh mục nhiệm vụ, dự án theo biểu kèm Thông báo 279/TB-KHTC — chỉ nạp khi người dùng bấm nút (chỉ có tên, lĩnh vực)
  const XA = ['Yên Châu', 'Vân Hồ', 'Quỳnh Nhai', 'Chiềng Sơn', 'Song Khủa', 'Tô Múa', 'Tân Yên', 'Đoàn Kết', 'Bình Thuận', 'Thuận Châu', 'Muổi Nọi', 'Bắc Yên', 'Tà Xùa', 'Chiềng Mai', 'Chiềng An', 'Chiềng Sung', 'Xuân Nha', 'Lóng Sập', 'Vân Sơn', 'Mộc Châu', 'Mộc Sơn', 'Sốp Cộp'];
  const DA279 = XA.map(x => ['Đo đạc, đăng ký, cấp giấy chứng nhận và xây dựng cơ sở dữ liệu đất đai ' + (x === 'Yên Châu' ? 'Yên Châu' : 'xã ' + x), 'Đo đạc, bản đồ, đăng ký đất đai'])
    .concat([
      ['Xác định ranh giới, đo đạc, đăng ký, cấp giấy chứng nhận và xây dựng cơ sở dữ liệu đất đai nông, lâm trường', 'Đo đạc, bản đồ, đăng ký đất đai'],
      ['Điều tra, đánh giá đất đai', 'Tài nguyên đất, giá đất'],
      ['Bảng giá đất, giá đất cụ thể', 'Tài nguyên đất, giá đất'],
      ['Báo cáo hiện trạng môi trường', 'Môi trường'],
      ['Xử lý chất thải rắn', 'Môi trường'],
      ['Các nhiệm vụ lĩnh vực địa chất, khoáng sản', 'Khác'],
      ['Đề án Khu nông nghiệp ứng dụng công nghệ cao', 'Khác'],
      ['Điều tra, đánh giá tổng hợp tài nguyên nước', 'Tài nguyên nước'],
      ['Định mức kinh tế kỹ thuật - Điều tra, đánh giá tài nguyên đất', 'Tài nguyên đất, giá đất'],
      ['Các nhiệm vụ tuyên truyền lĩnh vực môi trường', 'Môi trường'],
      ['Thuê phần mềm, hạ tầng kỹ thuật vận hành hệ thống thông tin đất đai tỉnh Sơn La (Hệ thống VDBLIS)', 'Chuyển đổi số'],
      ['Thuê dịch vụ công nghệ số "Hệ thống quản lý điều hành chính quyền số lĩnh vực nông nghiệp và môi trường" trên địa bàn tỉnh Sơn La', 'Chuyển đổi số']
    ]);

  A.Seed = {
    QD, DM, CB, DV, DA279,
    /* Nạp lần đầu: danh mục chức năng + cán bộ + đơn vị. Không ghi đè nếu đã có dữ liệu. */
    async firstRun() {
      const S = A.Store; if (S.cfg.seeded) return false;
      const items = [];
      if (!S.count('donvi')) DV.forEach(d => items.push({ c: 'donvi', rec: { ten: d[0], tenTat: d[1], loai: 'Đơn vị dự toán trực thuộc Sở', ghiChu: 'Theo biểu kèm Thông báo 279/TB-KHTC' } }));
      if (!S.count('canbo')) CB.forEach(c => items.push({ c: 'canbo', rec: { hoTen: c[0], tenGoi: c[1], chucVu: c[2], viTri: c[3], trangThai: 'danglam' } }));
      if (!S.count('danhmuc')) DM.forEach((d, i) => items.push({
        c: 'danhmuc', rec: {
          ma: d[0], nhom: d[1], ten: d[2], vaiTroText: d[3], tinhChat: d[4], ky: d[5], kyNguon: d[6], sanPham: d[7],
          canCu: d[8] + ' ' + QD, goiY: d[9], loai: 'chinhthuc', thuTu: i, ghiChu: GHI_CHU[d[0]] || '', chuTriId: '', phoiHopIds: []
        }
      }));
      if (items.length) await S.saveMany(items, { silent: true, note: 'Nạp danh mục ban đầu: chức năng, nhiệm vụ theo ' + QD + '; cán bộ, đơn vị theo Thông báo 279/TB-KHTC' });
      await S.setCfg({ seeded: true, seededAt: A.U.nowStamp() });
      return true;
    },
    async napDuAn279() {
      const S = A.Store, U = A.U, have = new Set(S.all('duan').map(d => U.norm(d.ten))); const items = []; let n = 0;
      DA279.forEach(d => {
        if (have.has(U.norm(d[0]))) return; n++;
        items.push({ c: 'duan', rec: { ma: 'DA-279-' + String(n).padStart(2, '0'), ten: d[0], linhVuc: d[1], loai: 'Nhiệm vụ, dự toán chi thường xuyên', vaiTroSo: 'Sở làm chủ đầu tư', trangThai: 'chuanbi', ghiChu: 'Tên lấy từ biểu phân công kèm Thông báo 279/TB-KHTC. Chưa có số liệu — cần cập nhật.', moc: [], nguonVon: [] } });
      });
      if (items.length) await S.saveMany(items, { note: 'Nạp ' + items.length + ' tên nhiệm vụ, dự án theo biểu kèm Thông báo 279/TB-KHTC' });
      return items.length;
    }
  };
})(App);
